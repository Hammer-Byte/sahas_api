const { requestService, logger } = require("sahas_utils");
const libPath = require("path");

function bucketiseRouteForFilename(filename = "") {
    const ext = libPath.extname(filename).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".gif"].includes(ext)) return "bucketise/images";
    if ([".mp4", ".mkv"].includes(ext)) return "bucketise/videos";
    if (ext === ".pdf") return "bucketise/pdfs";
    if (ext === ".mp3") return "bucketise/audios";
    if (ext === ".csv") return "bucketise/sheets";
    return null;
}

/**
 * Upload a buffer to sahas_media bucketise and return the durable CDN URL.
 */
function uploadBufferToMedia({ buffer, filename, mime = "application/octet-stream" } = {}) {
    const route = bucketiseRouteForFilename(filename);
    if (!route) {
        return Promise.reject(new Error(`Unsupported media extension for media service: ${filename || "(missing)"}`));
    }
    if (!process.env.SERVICE_MEDIA) {
        return Promise.reject(new Error("Missing SERVICE_MEDIA"));
    }

    const formData = new FormData();
    formData.append("file", new Blob([buffer], { type: mime }), filename || "upload.bin");

    return new Promise((resolve, reject) => {
        requestService({
            requestServiceName: process.env.SERVICE_MEDIA,
            requestPath: route,
            requestMethod: "POST",
            requestPostBody: formData,
            onRequestStart: () => logger.info(`Uploading content-publish media to ${route}`),
            onResponseReceieved: (body, status) => {
                if (status === 201 && body?.cdn_url) {
                    return resolve(body.cdn_url);
                }
                const message = typeof body?.error === "string" ? body.error : body?.error ? JSON.stringify(body.error) : `Media upload failed (${status})`;
                reject(new Error(message));
            },
            onRequestFailure: (error) => reject(error instanceof Error ? error : new Error(String(error))),
        });
    });
}

async function downloadUrlToBuffer(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download media (${response.status})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

module.exports = {
    uploadBufferToMedia,
    downloadUrlToBuffer,
    bucketiseRouteForFilename,
};
