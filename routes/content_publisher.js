const libExpress = require("express");
const multer = require("multer");
const libPath = require("path");
const { AUTHORITIES } = require("../constants");
const requires_authority = require("../middlewares/requires_authority");
const { getAutomationUserById } = require("../db/automation_users");
const {
    getContentPublishRuns,
    getContentPublishRunById,
    addContentPublishRun,
    updateContentPublishRunById,
} = require("../db/content_publish_runs");
const { queuePublish, getRunStatus } = require("../libs/content_publisher");
const { uploadBufferToMedia, downloadUrlToBuffer } = require("../libs/media_upload");
const { logger } = require("sahas_utils");

const router = libExpress.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
});

// Align with sahas_media ALLOWED_MEDIA_TYPES_IMAGE (+ HammerByte image support)
const IMAGE_EXTS = /\.(jpe?g|png|gif)$/i;

function normalizePlatforms(raw) {
    if (Array.isArray(raw)) {
        return raw.map((p) => String(p).trim().toLowerCase()).filter(Boolean);
    }
    if (typeof raw === "string") {
        return raw
            .split(",")
            .map((p) => p.trim().toLowerCase())
            .filter(Boolean);
    }
    return [];
}

function appendIfPresent(formData, key, value) {
    if (value === undefined || value === null) return;
    const asString = String(value).trim();
    if (!asString) return;
    formData.append(key, asString);
}

function parseTargetsJson(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function summarizeRuns(runs) {
    const summary = { queued: 0, running: 0, completed: 0, failed: 0, total: runs.length };
    for (const run of runs) {
        const status = String(run.status || "queued").toLowerCase();
        if (summary[status] !== undefined) summary[status] += 1;
    }
    return summary;
}

function decorateRun(run) {
    if (!run) return run;
    const mediaUrl = run.media_path || null; // stores CDN URL from media service
    return {
        ...run,
        targets: parseTargetsJson(run.targets_json),
        has_media: Boolean(mediaUrl),
        media_url: mediaUrl,
    };
}

function validatePlatformPayload({ platforms, automationUser, fields }) {
    const {
        instagramUserId,
        youtubeChannelId,
        instagramDestinations,
        instagramCaption,
        youtubeTitle,
        youtubeDestination,
        mediaKind,
    } = fields;

    if (platforms.includes("instagram")) {
        if (!automationUser.instagram_access_token || !instagramUserId) {
            return "Instagram requires access token and user id on the automation user";
        }
        const destinations = instagramDestinations
            .split(",")
            .map((d) => d.trim())
            .filter(Boolean);
        if (!destinations.length) {
            return "Select at least one Instagram destination (feed and/or story)";
        }
        if (destinations.includes("feed") && !instagramCaption.trim()) {
            return "instagram_caption is required for feed";
        }
    }

    if (platforms.includes("youtube")) {
        if (!automationUser.youtube_cookie || !youtubeChannelId) {
            return "YouTube requires cookie and channel id on the automation user";
        }
        if (!youtubeTitle) {
            return "youtube_title is required";
        }
        if (mediaKind === "image" && youtubeDestination && youtubeDestination !== "community") {
            return "YouTube image destination must be community";
        }
        if (mediaKind === "video" && youtubeDestination && youtubeDestination !== "shorts") {
            return "YouTube video destination must be shorts";
        }
    }

    return null;
}

function buildHammerbyteForm({ fileBuffer, fileName, mime, platforms, automationUser, fields }) {
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mime || "application/octet-stream" });
    formData.append("file", blob, fileName || "upload.bin");
    formData.append("platforms", platforms.join(","));

    if (platforms.includes("instagram")) {
        formData.append("instagram_access_token", automationUser.instagram_access_token);
        formData.append("instagram_user_id", fields.instagramUserId);
        appendIfPresent(formData, "instagram_destinations", fields.instagramDestinations);
        appendIfPresent(formData, "instagram_caption", fields.instagramCaption);
    }

    if (platforms.includes("youtube")) {
        formData.append("youtube_cookie", automationUser.youtube_cookie);
        formData.append("youtube_channel_id", fields.youtubeChannelId);
        formData.append("youtube_title", fields.youtubeTitle);
        appendIfPresent(formData, "youtube_description", fields.youtubeDescription);
        appendIfPresent(formData, "youtube_destination", fields.youtubeDestination);
    }

    return formData;
}

async function persistQueuedRun({
    responseBody,
    platforms,
    automationUserId,
    createdByUserId,
    retryOfRunId,
    mediaKind,
    mediaFilename,
    mediaMime,
    mediaCdnUrl,
    fields,
}) {
    const localId = await addContentPublishRun({
        hammerbyte_run_id: responseBody.run_id,
        automation_user_id: automationUserId,
        created_by_user_id: createdByUserId,
        retry_of_run_id: retryOfRunId,
        media_kind: responseBody.media_kind || mediaKind || "image",
        media_filename: mediaFilename,
        media_mime: mediaMime,
        media_path: mediaCdnUrl,
        platforms: (responseBody.platforms || platforms).join?.(",") || platforms.join(","),
        status: "queued",
        instagram_user_id: platforms.includes("instagram") ? fields.instagramUserId : null,
        instagram_caption: platforms.includes("instagram") ? fields.instagramCaption : null,
        instagram_destinations: platforms.includes("instagram")
            ? (responseBody.instagram_destinations || fields.instagramDestinations.split(",")).join?.(",") || fields.instagramDestinations
            : null,
        youtube_channel_id: platforms.includes("youtube") ? fields.youtubeChannelId : null,
        youtube_title: platforms.includes("youtube") ? fields.youtubeTitle : null,
        youtube_description: platforms.includes("youtube") ? fields.youtubeDescription : null,
        youtube_destination: platforms.includes("youtube") ? responseBody.youtube_destination || fields.youtubeDestination : null,
    });

    return localId ? await getContentPublishRunById({ id: localId }) : null;
}

router.get("/runs", requires_authority(AUTHORITIES.USE_PAGE_CONTENT_PUBLISHING), async (req, res) => {
    const start_date = req.query.start_date || null;
    const end_date = req.query.end_date || null;
    const runs = (await getContentPublishRuns({ start_date, end_date })).map(decorateRun);
    return res.status(200).json({
        runs,
        summary: summarizeRuns(runs),
        start_date,
        end_date,
    });
});

router.get("/runs/:id", requires_authority(AUTHORITIES.USE_PAGE_CONTENT_PUBLISHING), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Run Id" });
    }

    const localRun = await getContentPublishRunById({ id: req.params.id });
    if (!localRun) {
        return res.status(400).json({ error: "Run Not Exist" });
    }

    try {
        const { responseCode, responseBody } = await getRunStatus({ runId: localRun.hammerbyte_run_id });
        if (responseCode === 401) {
            return res.status(401).json({ error: "Unauthorized with HammerByte content-publisher" });
        }
        if (responseCode === 404) {
            return res.status(404).json({ error: responseBody?.error || "Content publish run not found" });
        }
        if (responseCode !== 200 || !responseBody?.run) {
            return res.status(200).json({
                ...decorateRun(localRun),
                hammerbyte: responseBody || null,
                refresh_error: responseBody?.error || `Status ${responseCode}`,
            });
        }

        const remote = responseBody.run;
        const targets = remote.targets || [];
        await updateContentPublishRunById({
            id: localRun.id,
            status: remote.status || localRun.status,
            error_message: remote.error_message || null,
            started_on: remote.started_on || null,
            finished_on: remote.finished_on || null,
            targets_json: JSON.stringify(targets),
        });

        const updated = await getContentPublishRunById({ id: localRun.id });
        return res.status(200).json({
            ...decorateRun(updated),
            targets,
            hammerbyte: remote,
        });
    } catch (error) {
        logger.error(`content-publisher refresh: ${error}`);
        return res.status(200).json({ ...decorateRun(localRun), refresh_error: error?.message || "Failed to refresh run" });
    }
});

router.post("/publish", requires_authority(AUTHORITIES.USE_PAGE_CONTENT_PUBLISHING), upload.single("file"), async (req, res) => {
    try {
        const mediaCdnUrl = (req.body.media_cdn_url || "").toString().trim();
        let fileBuffer = req.file?.buffer || null;
        let mediaFilename = req.body.media_filename || req.file?.originalname || null;
        let mediaMime = req.body.media_mime || req.file?.mimetype || null;

        // Preferred path: UI already uploaded via shared FileInput → media service
        if (mediaCdnUrl) {
            try {
                fileBuffer = await downloadUrlToBuffer(mediaCdnUrl);
            } catch (error) {
                logger.error(`content-publisher download media: ${error}`);
                return res.status(400).json({ error: error?.message || "Failed to download media from CDN" });
            }
            if (!mediaFilename) {
                try {
                    mediaFilename = decodeURIComponent(libPath.basename(new URL(mediaCdnUrl).pathname)) || "publish.jpg";
                } catch (e) {
                    mediaFilename = "publish.jpg";
                }
            }
            if (!mediaMime) {
                mediaMime = "image/jpeg";
            }
        } else if (fileBuffer) {
            // Fallback: raw multipart file → upload to media service, then publish
            const name = req.file.originalname || "";
            if (!IMAGE_EXTS.test(name)) {
                return res.status(400).json({ error: "Only image files are supported (jpg jpeg png gif)" });
            }
            try {
                const uploadedUrl = await uploadBufferToMedia({
                    buffer: fileBuffer,
                    filename: name || `publish${libPath.extname(name) || ".jpg"}`,
                    mime: req.file.mimetype,
                });
                req.body.media_cdn_url = uploadedUrl;
            } catch (error) {
                logger.error(`content-publisher media upload: ${error}`);
                return res.status(400).json({ error: error?.message || "Failed to store media" });
            }
        } else {
            return res.status(400).json({ error: "Missing media_cdn_url (upload image with FileInput first)" });
        }

        const resolvedCdnUrl = (req.body.media_cdn_url || mediaCdnUrl || "").toString().trim();
        if (!resolvedCdnUrl || !fileBuffer) {
            return res.status(400).json({ error: "Missing media" });
        }

        if (mediaFilename && !IMAGE_EXTS.test(mediaFilename) && !IMAGE_EXTS.test(resolvedCdnUrl)) {
            return res.status(400).json({ error: "Only image files are supported (jpg jpeg png gif)" });
        }

        const automationUserId = Number(req.body.automation_user_id);
        if (!automationUserId) {
            return res.status(400).json({ error: "Missing automation_user_id" });
        }

        const automationUser = await getAutomationUserById({ id: automationUserId });
        if (!automationUser) {
            return res.status(400).json({ error: "Automation User Not Exist" });
        }

        const platforms = normalizePlatforms(req.body.platforms).filter((p) => p === "instagram" || p === "youtube");
        if (!platforms.length) {
            return res.status(400).json({ error: "Select at least one platform (instagram, youtube)" });
        }

        const fields = {
            instagramUserId: (req.body.instagram_user_id || automationUser.instagram_user_id || "").trim(),
            youtubeChannelId: (req.body.youtube_channel_id || automationUser.youtube_channel_id || "").trim(),
            instagramDestinations: (req.body.instagram_destinations || "feed").toString().trim() || "feed",
            instagramCaption: (req.body.instagram_caption || "").toString(),
            youtubeTitle: (req.body.youtube_title || "").toString().trim(),
            youtubeDescription: (req.body.youtube_description || "").toString(),
            youtubeDestination: (req.body.youtube_destination || "community").toString().trim() || "community",
            mediaKind: "image",
        };

        const validationError = validatePlatformPayload({ platforms, automationUser, fields });
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        const formData = buildHammerbyteForm({
            fileBuffer,
            fileName: mediaFilename || "publish.jpg",
            mime: mediaMime,
            platforms,
            automationUser,
            fields,
        });

        const { responseCode, responseBody } = await queuePublish({ formData });

        if (responseCode === 401) {
            return res.status(401).json({ error: "Unauthorized with HammerByte content-publisher" });
        }

        if (responseCode !== 202 || !responseBody?.run_id) {
            return res.status(400).json({ error: responseBody?.error || `Publish failed (${responseCode})` });
        }

        const localRun = await persistQueuedRun({
            responseBody,
            platforms,
            automationUserId,
            createdByUserId: req.user?.id,
            retryOfRunId: null,
            mediaKind: "image",
            mediaFilename,
            mediaMime,
            mediaCdnUrl: resolvedCdnUrl,
            fields,
        });

        return res.status(202).json({
            ...decorateRun(localRun || {}),
            hammerbyte: responseBody,
        });
    } catch (error) {
        logger.error(`content-publisher publish: ${error}`);
        return res.status(400).json({ error: error?.message || "Failed to queue publish" });
    }
});

router.post("/runs/:id/retry", requires_authority(AUTHORITIES.USE_PAGE_CONTENT_PUBLISHING), async (req, res) => {
    try {
        const sourceRun = await getContentPublishRunById({ id: req.params.id });
        if (!sourceRun) {
            return res.status(400).json({ error: "Run Not Exist" });
        }

        if (!sourceRun.media_path) {
            return res.status(400).json({ error: "Original media is missing; re-publish from the Publish tab" });
        }

        if (!sourceRun.automation_user_id) {
            return res.status(400).json({ error: "Automation user missing on this run" });
        }

        const automationUser = await getAutomationUserById({ id: sourceRun.automation_user_id });
        if (!automationUser) {
            return res.status(400).json({ error: "Automation User Not Exist" });
        }

        const requested = normalizePlatforms(req.body?.platforms);
        const sourceTargets = parseTargetsJson(sourceRun.targets_json);
        const failedPlatforms = sourceTargets.filter((t) => String(t.status).toLowerCase() === "failed").map((t) => t.platform);
        const fallbackFailed = String(sourceRun.status).toLowerCase() === "failed" ? normalizePlatforms(sourceRun.platforms) : [];
        const platforms = (requested.length ? requested : failedPlatforms.length ? failedPlatforms : fallbackFailed).filter(
            (p) => p === "instagram" || p === "youtube"
        );

        if (!platforms.length) {
            return res.status(400).json({ error: "No failed platforms to retry" });
        }

        const fields = {
            instagramUserId: (sourceRun.instagram_user_id || automationUser.instagram_user_id || "").trim(),
            youtubeChannelId: (sourceRun.youtube_channel_id || automationUser.youtube_channel_id || "").trim(),
            instagramDestinations: (sourceRun.instagram_destinations || "feed").toString().trim() || "feed",
            instagramCaption: (sourceRun.instagram_caption || "").toString(),
            youtubeTitle: (sourceRun.youtube_title || "").toString().trim(),
            youtubeDescription: (sourceRun.youtube_description || "").toString(),
            youtubeDestination: (sourceRun.youtube_destination || "community").toString().trim() || "community",
            mediaKind: sourceRun.media_kind || "image",
        };

        const validationError = validatePlatformPayload({ platforms, automationUser, fields });
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        const fileBuffer = await downloadUrlToBuffer(sourceRun.media_path);
        const formData = buildHammerbyteForm({
            fileBuffer,
            fileName: sourceRun.media_filename || "retry.jpg",
            mime: sourceRun.media_mime,
            platforms,
            automationUser,
            fields,
        });

        const { responseCode, responseBody } = await queuePublish({ formData });
        if (responseCode === 401) {
            return res.status(401).json({ error: "Unauthorized with HammerByte content-publisher" });
        }
        if (responseCode !== 202 || !responseBody?.run_id) {
            return res.status(400).json({ error: responseBody?.error || `Retry failed (${responseCode})` });
        }

        const localRun = await persistQueuedRun({
            responseBody,
            platforms,
            automationUserId: sourceRun.automation_user_id,
            createdByUserId: req.user?.id,
            retryOfRunId: sourceRun.id,
            mediaKind: sourceRun.media_kind || "image",
            mediaFilename: sourceRun.media_filename,
            mediaMime: sourceRun.media_mime,
            mediaCdnUrl: sourceRun.media_path,
            fields,
        });

        return res.status(202).json({
            ...decorateRun(localRun || {}),
            hammerbyte: responseBody,
        });
    } catch (error) {
        logger.error(`content-publisher retry: ${error}`);
        return res.status(400).json({ error: error?.message || "Failed to retry publish" });
    }
});

module.exports = router;
