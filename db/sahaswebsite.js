const { logger } = require("sahas_utils");
const { getWebsiteSettings } = require("./website_settings");
const { getWebsiteHeader } = require("./website_header");
const { getWebsiteFooter } = require("./website_footer");
const { getWebsiteMobileBar } = require("./website_mobile_bar");
const { getWebsiteHome } = require("./website_home");
const { getWebsiteAbout } = require("./website_about");
const { getWebsiteContact } = require("./website_contact");
const { getWebsiteCoursesPage } = require("./website_courses_page");
const { getWebsiteFacilitiesPage } = require("./website_facilities_page");
const { getWebsiteNotificationsPage } = require("./website_notifications_page");
const { getWebsiteGalleryPage } = require("./website_gallery_page");
const { getWebsiteBrochuresPage } = require("./website_brochures_page");
const { getAllWebsiteLinks } = require("./website_links");
const { getAllWebsiteSeo } = require("./website_seo");
const { getAllWebsiteBranches } = require("./website_branches");
const { getAllWebsiteCourses } = require("./website_courses");
const { getAllWebsiteCourseFeatures } = require("./website_course_features");
const { getAllWebsiteFacilities } = require("./website_facilities");
const { getAllWebsiteNotifications } = require("./website_notifications");
const { getAllWebsiteNotificationImages } = require("./website_notification_images");
const { getAllWebsiteNotificationFiles } = require("./website_notification_files");
const { getAllWebsiteTestimonials } = require("./website_testimonials");
const { getAllWebsiteSocialLinks } = require("./website_social_links");
const { getAllWebsiteStats } = require("./website_stats");
const { getAllWebsiteHomeHighlights } = require("./website_home_highlights");
const { getAllWebsiteHomeAppFeatures } = require("./website_home_app_features");
const { getAllWebsiteHomeAchievements } = require("./website_home_achievements");
const { getAllWebsiteHomeGalleryTiles } = require("./website_home_gallery_tiles");
const { getAllWebsiteHomeBrochureCards } = require("./website_home_brochure_cards");
const { getAllWebsiteGalleryCategories } = require("./website_gallery_categories");
const { getAllWebsiteGalleryAlbums } = require("./website_gallery_albums");
const { getAllWebsiteGalleryMedia } = require("./website_gallery_media");
const { getAllWebsiteBrochures } = require("./website_brochures");

function keep(object) {
    return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

function on(value, fallback = false) {
    if (value === null || value === undefined || value === "") return fallback;
    return value === true || value === 1 || value === "1";
}

function seoFromRow(row) {
    if (!row) return null;
    const seo = keep({
        title: row.title,
        description: row.description,
        keywords: row.keywords,
        canonicalUrl: row.canonical_url,
        ogTitle: row.og_title,
        ogDescription: row.og_description,
        ogImage: row.og_image,
        twitterTitle: row.twitter_title,
        twitterDescription: row.twitter_description,
    });
    if (on(row.no_index)) seo.noIndex = true;
    return Object.keys(seo).length ? seo : null;
}

function linksFor(links, groupKey) {
    return (links || [])
        .filter((row) => row.group_key === groupKey)
        .map((row) => keep({ label: row.label, href: row.href, icon: row.icon }));
}

function splitLines(value) {
    return String(value || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}

function splitParts(line) {
    return line.split("|").map((part) => part.trim());
}

function grouped(list, key) {
    const map = new Map();
    (list || []).forEach((item) => {
        const id = String(item[key]);
        if (!map.has(id)) map.set(id, []);
        map.get(id).push(item);
    });
    return map;
}

function withSeo(seoByOwner, ownerType, ownerKey, item) {
    const seo = seoByOwner.get(`${ownerType}:${ownerKey}`);
    if (seo) item.seo = seo;
    return item;
}

function getSahasWebsite() {
    return Promise.all([
        getWebsiteSettings(),
        getWebsiteHeader(),
        getWebsiteFooter(),
        getWebsiteMobileBar(),
        getWebsiteHome(),
        getWebsiteAbout(),
        getWebsiteContact(),
        getWebsiteCoursesPage(),
        getWebsiteFacilitiesPage(),
        getWebsiteNotificationsPage(),
        getWebsiteGalleryPage(),
        getWebsiteBrochuresPage(),
        getAllWebsiteLinks(),
        getAllWebsiteSeo(),
        getAllWebsiteBranches(),
        getAllWebsiteCourses(),
        getAllWebsiteCourseFeatures(),
        getAllWebsiteFacilities(),
        getAllWebsiteNotifications(),
        getAllWebsiteNotificationImages(),
        getAllWebsiteNotificationFiles(),
        getAllWebsiteTestimonials(),
        getAllWebsiteSocialLinks(),
        getAllWebsiteStats(),
        getAllWebsiteHomeHighlights(),
        getAllWebsiteHomeAppFeatures(),
        getAllWebsiteHomeAchievements(),
        getAllWebsiteHomeGalleryTiles(),
        getAllWebsiteHomeBrochureCards(),
        getAllWebsiteGalleryCategories(),
        getAllWebsiteGalleryAlbums(),
        getAllWebsiteGalleryMedia(),
        getAllWebsiteBrochures(),
    ])
        .then(([
            settings, header, footer, mobile, home, about, contact, coursesPage, facilitiesPage, notificationsPage, galleryPage, brochuresPage,
            links, seoRows, branches, courses, courseFeatures, facilities, notifications, notificationImages, notificationFiles,
            testimonials, social, stats, homeHighlights, appFeatures, achievements, galleryTiles, brochureCards, categories, albums, media, brochures,
        ]) => {

        if (!settings && !home) return false;

        const seoByOwner = new Map((seoRows || []).map((row) => [`${row.owner_type}:${row.owner_key}`, seoFromRow(row)]));
        const featuresByCourse = grouped(courseFeatures, "course_public_id");
        const imagesByNotice = grouped(notificationImages, "notification_public_id");
        const filesByNotice = grouped(notificationFiles, "notification_public_id");
        const mediaByAlbum = grouped(media, "album_public_id");

        const courseItems = (courses || []).map((row) => {
            const item = keep({
                id: row.public_id,
                slug: row.slug,
                title: row.title,
                subtitle: row.subtitle,
                shortDescription: row.short_description,
                description: row.description,
                category: row.category,
                board: row.board,
                university: row.university,
                medium: row.medium,
                duration: row.duration,
                badge: row.badge,
                priceLabel: row.price_label,
                image: row.image,
                imageAlt: row.image_alt,
                brochureUrl: row.brochure_url,
                ctaText: row.cta_text,
                enquiryUrl: row.enquiry_url,
                detailUrl: row.detail_url,
            });
            if (row.price !== null && row.price !== undefined && Number(row.price) !== 0) item.price = Number(row.price);
            item.featured = on(row.featured);
            item.isActive = on(row.is_active, true);
            const features = (featuresByCourse.get(String(row.public_id)) || []).map((feature) => keep({ icon: feature.icon, title: feature.title }));
            if (features.length) item.features = features;
            return withSeo(seoByOwner, "course", row.public_id, item);
        });

        const branchItems = (branches || []).map((row) => {
            const item = keep({
                id: row.public_id,
                slug: row.slug,
                name: row.name,
                label: row.label,
                description: row.description,
                address: row.address,
                phone: row.phone,
                whatsapp: row.whatsapp,
                mapUrl: row.map_url,
                mapEmbedUrl: row.map_embed_url,
                mapQuery: row.map_query,
                city: row.city,
                state: row.state,
                country: row.country,
            });
            if (row.latitude !== null && row.latitude !== undefined) item.latitude = Number(row.latitude);
            if (row.longitude !== null && row.longitude !== undefined) item.longitude = Number(row.longitude);
            item.isActive = on(row.is_active, true);
            return item;
        });

        const facilityItems = (facilities || []).map((row) => {
            const item = keep({
                id: row.public_id,
                slug: row.slug,
                title: row.title,
                description: row.description,
                icon: row.icon,
                image: row.image,
                imageAlt: row.image_alt,
                category: row.category,
                badge: row.badge,
                detailUrl: row.detail_url,
            });
            item.featured = on(row.featured);
            item.special = on(row.special);
            item.isActive = on(row.is_active, true);
            const points = splitLines(row.points);
            if (points.length) item.features = points;
            return item;
        });

        const notificationItems = (notifications || []).map((row) => {
            const item = keep({
                id: row.public_id,
                slug: row.slug,
                title: row.title,
                category: row.category,
                course: row.course,
                description: row.description,
                content: row.content,
                image: row.image,
                imageAlt: row.image_alt,
                thumbnail: row.thumbnail,
                pdfUrl: row.pdf_url,
                pdfTitle: row.pdf_title,
                pdfSize: row.pdf_size,
                videoUrl: row.video_url,
                videoThumbnail: row.video_thumbnail,
                publishedAt: row.published_at,
                ctaText: row.cta_text,
                ctaUrl: row.cta_url,
                tags: row.tags,
            });
            item.isFeatured = on(row.is_featured);
            item.isImportant = on(row.is_important);
            if (row.is_new !== null && row.is_new !== undefined) item.isNew = on(row.is_new);
            item.isPublished = on(row.is_published, true);
            const images = (imagesByNotice.get(String(row.public_id)) || []).map((image) => keep({ url: image.url, alt: image.alt_text }));
            if (images.length) item.images = images;
            const attachments = (filesByNotice.get(String(row.public_id)) || []).map((file) => keep({ title: file.title, url: file.url, size: file.file_size, type: file.file_type }));
            if (attachments.length) item.attachments = attachments;
            return withSeo(seoByOwner, "notification", row.public_id, item);
        });

        const testimonialItems = (testimonials || []).map((row) => {
            const item = keep({
                id: row.public_id,
                name: row.name,
                title: row.title,
                description: row.description,
                reviewerType: row.reviewer_type,
                role: row.role,
                course: row.course,
                score: row.score,
                image: row.image,
                imageAlt: row.image_alt,
                mediaUrl: row.media_url,
                mediaType: row.media_type,
            });
            if (row.rating !== null && row.rating !== undefined) item.rating = Number(row.rating);
            item.isPublished = on(row.is_published, true);
            return item;
        });

        const socialItems = (social || []).map((row) => keep({ id: row.public_id, platform: row.platform, url: row.url, icon: row.icon }));

        const albumMedia = (publicId) =>
            (mediaByAlbum.get(String(publicId)) || []).map((item, index) => {
                const entry = keep({
                    id: item.public_id,
                    url: item.url,
                    thumbnail: item.thumbnail,
                    title: item.title,
                    caption: item.caption,
                    alt: item.alt_text,
                    duration: item.duration,
                });
                entry.type = item.media_type === "video" ? "video" : "image";
                entry.order = index + 1;
                if (on(item.downloadable)) entry.downloadable = true;
                return entry;
            });

        const albumItems = (albums || [])
            .filter((row) => row.item_type !== "person")
            .map((row) => {
                const item = keep({
                    id: row.public_id,
                    slug: row.slug,
                    categorySlug: row.category_slug,
                    title: row.title,
                    description: row.description,
                    location: row.location,
                    eventDate: row.event_date,
                    coverImage: row.cover_image,
                    coverAlt: row.cover_alt,
                    tags: row.tags,
                });
                item.isFeatured = on(row.is_featured);
                item.isPublished = on(row.is_published, true);
                item.media = albumMedia(row.public_id);
                return withSeo(seoByOwner, "gallery_album", row.public_id, item);
            });

        const people = (founders) =>
            (albums || [])
                .filter((row) => row.item_type === "person" && (founders ? row.category_slug === "founders" : row.category_slug !== "founders"))
                .map((row) => {
                    const photos = albumMedia(row.public_id);
                    const firstImage = photos.find((item) => item.type === "image");
                    const item = keep({
                        id: row.public_id,
                        slug: row.slug,
                        name: row.person_name || row.title,
                        designation: row.designation,
                        department: row.department,
                        description: row.description,
                        experience: row.experience,
                        image: row.person_image || row.cover_image || firstImage?.url,
                        imageAlt: row.person_image_alt || row.cover_alt,
                        categorySlug: row.category_slug,
                    });
                    item.isPublished = on(row.is_published, true);
                    if (photos.length) item.media = photos;
                    return item;
                });

        const homeRow = home || {};
        const aboutRow = about || {};
        const hero = withSeo(seoByOwner, "page", "home.hero", keep({
            badge: homeRow.hero_badge,
            badgeSecondary: homeRow.hero_badge_secondary,
            title: homeRow.hero_title,
            highlightedText: homeRow.hero_highlighted_text,
            description: homeRow.hero_description,
            image: homeRow.hero_image,
            imageAlt: homeRow.hero_image_alt,
            primaryButton: keep({ text: homeRow.hero_primary_text, url: homeRow.hero_primary_url }),
            secondaryButton: keep({ url: homeRow.hero_secondary_url }),
            floatTop: homeRow.hero_float_top,
            floatBottom: homeRow.hero_float_bottom,
        }));
        if (hero.primaryButton && !Object.keys(hero.primaryButton).length) delete hero.primaryButton;
        if (hero.secondaryButton && !Object.keys(hero.secondaryButton).length) delete hero.secondaryButton;

        const founder = keep({
            name: homeRow.founder_name,
            designation: homeRow.founder_designation,
            image: homeRow.founder_image,
            imageAlt: homeRow.founder_image_alt,
            message: homeRow.founder_message,
            description: homeRow.founder_description,
            biography: homeRow.founder_biography,
            quote: homeRow.founder_quote,
            ctaText: homeRow.founder_cta_text,
            ctaUrl: homeRow.founder_cta_url,
        });
        if (homeRow.founder_is_visible !== null && homeRow.founder_is_visible !== undefined) founder.isVisible = on(homeRow.founder_is_visible);

        const pageObject = (row, fields, flags, seoKey) => {
            const item = keep(Object.fromEntries(fields.map(([key, column]) => [key, row?.[column]])));
            flags.forEach(([key, column]) => {
                if (row?.[column] !== null && row?.[column] !== undefined) item[key] = on(row[column]);
            });
            return withSeo(seoByOwner, "page", seoKey, item);
        };

        const aboutPage = pageObject(
            aboutRow,
            [
                ["eyebrow", "eyebrow"], ["title", "title"], ["description", "description"], ["image", "image"], ["imageAlt", "image_alt"],
                ["historyEyebrow", "history_eyebrow"], ["historyTitle", "history_title"], ["historyText", "history_text"],
                ["journeyEyebrow", "journey_eyebrow"], ["journeyTitle", "journey_title"], ["journeyDescription", "journey_description"],
                ["founderPlaceholderTitle", "founder_placeholder_title"], ["founderPlaceholderText", "founder_placeholder_text"],
                ["academicEyebrow", "academic_eyebrow"], ["academicTitle", "academic_title"], ["academicDescription", "academic_description"],
                ["philosophyEyebrow", "philosophy_eyebrow"], ["philosophyTitle", "philosophy_title"], ["philosophyDescription", "philosophy_description"],
                ["mapEyebrow", "map_eyebrow"], ["mapTitle", "map_title"], ["mapDescription", "map_description"],
                ["onlineEyebrow", "online_eyebrow"], ["onlineTitle", "online_title"], ["onlineDescription", "online_description"],
                ["onlineImage", "online_image"], ["onlineCtaUrl", "online_cta_url"],
                ["socialEyebrow", "social_eyebrow"], ["socialTitle", "social_title"], ["socialDescription", "social_description"],
                ["brandLine1", "brand_line_1"], ["brandLine2", "brand_line_2"],
            ],
            [
                ["showHistory", "show_history"], ["showJourney", "show_journey"], ["showFounder", "show_founder"],
                ["showFounderPlaceholder", "show_founder_placeholder"], ["showAcademic", "show_academic"],
                ["showMissionVision", "show_mission_vision"], ["showPhilosophy", "show_philosophy"], ["showMap", "show_map"],
                ["showOnline", "show_online"], ["showSocial", "show_social"], ["showBrand", "show_brand"],
            ],
            "aboutPage",
        );
        aboutPage.highlights = splitLines(about?.highlights).map((line) => {
            const [value, label] = splitParts(line);
            return keep({ value, label });
        });
        aboutPage.journeySteps = splitLines(about?.journey).map((line) => {
            const [year, title, description] = splitParts(line);
            return keep({ title, description, year });
        });
        aboutPage.learningModes = splitLines(about?.learning).map((line) => {
            const [icon, title, description] = splitParts(line);
            return keep({ title, description, icon });
        });
        aboutPage.philosophy = splitLines(about?.philosophy).map((line) => {
            const [icon, title, description] = splitParts(line);
            return keep({ title, description, icon });
        });
        aboutPage.courseOverview = splitLines(about?.course_overview);

        const facilitiesPageItem = pageObject(
            facilitiesPage,
            [
                ["eyebrow", "eyebrow"], ["title", "title"], ["description", "description"], ["introEyebrow", "intro_eyebrow"],
                ["introTitle", "intro_title"], ["introText", "intro_text"], ["carouselEyebrow", "carousel_eyebrow"],
                ["carouselTitle", "carousel_title"], ["carouselDescription", "carousel_description"], ["ecosystemTitle", "ecosystem_title"],
                ["ecosystemDescription", "ecosystem_description"], ["closingBrand", "closing_brand"], ["ctaTitle", "cta_title"],
                ["ctaPrimaryText", "cta_primary_text"], ["ctaPrimaryUrl", "cta_primary_url"], ["ctaSecondaryUrl", "cta_secondary_url"],
            ],
            [["showFilters", "show_filters"]],
            "facilitiesPage",
        );
        facilitiesPageItem.heroFloats = splitLines(facilitiesPage?.float_title).map((label) => keep({ label }));
        facilitiesPageItem.closingLines = splitLines(facilitiesPage?.line_title);

        return {
            siteSettings: keep({
                name: settings?.site_name,
                tagline: settings?.site_tagline,
                logo: settings?.site_logo,
                phone: settings?.site_phone,
                whatsapp: settings?.site_whatsapp,
                email: settings?.site_email,
            }),
            seo: seoByOwner.get("site:site") || {},
            header: {
                ...keep({
                    logo: header?.header_logo,
                    brandName: header?.header_brand_name,
                    brandTagline: header?.header_brand_tagline,
                    phone: header?.header_phone,
                    ctaUrl: header?.header_cta_url,
                }),
                navigation: linksFor(links, "header"),
            },
            footer: {
                ...keep({ description: footer?.footer_description, copyright: footer?.footer_copyright }),
                quickLinks: linksFor(links, "footer_quick"),
                legalLinks: linksFor(links, "footer_legal"),
            },
            mobileCta: keep({
                whatsapp: mobile?.mobile_whatsapp,
                phone: mobile?.mobile_phone,
                coursesUrl: mobile?.mobile_courses_url,
                appUrl: mobile?.mobile_app_url,
            }),
            branches: branchItems,
            courses: courseItems,
            home: {
                hero,
                stats: {
                    ...keep({ eyebrow: homeRow.stats_eyebrow, title: homeRow.stats_title }),
                    items: (stats || []).map((row) => keep({ value: row.value_text, label: row.label, hint: row.hint })),
                },
                about: withSeo(seoByOwner, "page", "home.about", {
                    ...keep({
                        eyebrow: homeRow.about_eyebrow,
                        title: homeRow.about_title,
                        description: homeRow.about_description,
                        image: homeRow.about_image,
                        alt: homeRow.about_image_alt,
                        ctaText: homeRow.about_cta_text,
                        ctaUrl: homeRow.about_cta_url,
                    }),
                    highlights: (homeHighlights || []).map((row) => keep({ icon: row.icon, title: row.title, description: row.description })),
                }),
                founder: Object.keys(founder).length ? founder : null,
                facilities: {
                    ...keep({
                        eyebrow: homeRow.facilities_eyebrow,
                        title: homeRow.facilities_title,
                        description: homeRow.facilities_description,
                        viewAllText: homeRow.facilities_view_all_text,
                        viewAllUrl: homeRow.facilities_view_all_url,
                    }),
                    items: facilityItems,
                },
                courses: withSeo(seoByOwner, "page", "home.courses", keep({
                    eyebrow: homeRow.courses_eyebrow,
                    title: homeRow.courses_title,
                    description: homeRow.courses_description,
                    viewAllText: homeRow.courses_view_all_text,
                    viewAllUrl: homeRow.courses_view_all_url,
                })),
                app: withSeo(seoByOwner, "page", "home.app", {
                    ...keep({
                        eyebrow: homeRow.app_eyebrow,
                        title: homeRow.app_title,
                        description: homeRow.app_description,
                        image: homeRow.app_image,
                        alt: homeRow.app_image_alt,
                        androidUrl: homeRow.app_android_url,
                        iosUrl: homeRow.app_ios_url,
                        secondaryButtonText: homeRow.app_store_label,
                    }),
                    features: (appFeatures || []).map((row) => row.title).filter(Boolean),
                }),
                mission: withSeo(seoByOwner, "page", "home.mission", {
                    ...keep({ title: homeRow.mission_title, text: homeRow.mission_text, icon: homeRow.mission_icon }),
                    ...(homeRow.mission_is_visible !== null && homeRow.mission_is_visible !== undefined ? { isVisible: on(homeRow.mission_is_visible) } : {}),
                }),
                vision: withSeo(seoByOwner, "page", "home.vision", {
                    ...keep({ title: homeRow.vision_title, text: homeRow.vision_text, icon: homeRow.vision_icon }),
                    ...(homeRow.vision_is_visible !== null && homeRow.vision_is_visible !== undefined ? { isVisible: on(homeRow.vision_is_visible) } : {}),
                }),
                notifications: notificationItems,
                testimonials: testimonialItems,
                testimonialsPage: withSeo(seoByOwner, "page", "home.testimonialsPage", keep({
                    eyebrow: homeRow.testimonials_eyebrow,
                    title: homeRow.testimonials_title,
                    description: homeRow.testimonials_description,
                    trustLabel: homeRow.testimonials_trust_label,
                })),
                achievements: (achievements || []).map((row) => keep({ category: row.category, value: row.value_text, title: row.title, meta: row.meta })),
                galleryPreview: (galleryTiles || []).map((row) => keep({ title: row.title, description: row.description, icon: row.icon, image: row.image, alt: row.alt_text, link: row.link_url })),
                brochures: (brochureCards || []).map((row) => keep({ title: row.title, description: row.description, pdfUrl: row.file_url, detailUrl: row.link_url })),
                freeContent: {
                    ...keep({ title: homeRow.free_title, description: homeRow.free_description }),
                    items: splitLines(homeRow.free_items).map((line) => {
                        const [icon, title, description] = splitParts(line);
                        return keep({ icon, title, description });
                    }),
                },
                contact: {
                    ...keep({ title: homeRow.follow_title, description: homeRow.follow_description }),
                    social: socialItems,
                },
            },
            aboutPage,
            coursesPage: pageObject(
                coursesPage,
                [
                    ["eyebrow", "eyebrow"], ["title", "title"], ["description", "description"], ["introTitle", "intro_title"], ["introText", "intro_text"],
                    ["ctaTitle", "cta_title"], ["ctaDescription", "cta_description"], ["ctaPrimaryText", "cta_primary_text"],
                    ["ctaPrimaryUrl", "cta_primary_url"], ["ctaSecondaryUrl", "cta_secondary_url"],
                ],
                [["showSearch", "show_search"], ["showFilters", "show_filters"]],
                "coursesPage",
            ),
            facilitiesPage: facilitiesPageItem,
            notificationsPage: pageObject(
                notificationsPage,
                [
                    ["eyebrow", "eyebrow"], ["title", "title"], ["description", "description"], ["listEyebrow", "list_eyebrow"],
                    ["listTitle", "list_title"], ["listDescription", "list_description"], ["emptyTitle", "empty_title"], ["emptyText", "empty_text"],
                    ["searchEmptyTitle", "search_empty_title"], ["searchEmptyText", "search_empty_text"], ["loadMoreText", "load_more_text"],
                    ["pageSize", "page_size"],
                ],
                [["showSearch", "show_search"], ["showFilters", "show_filters"], ["showSort", "show_sort"]],
                "notificationsPage",
            ),
            galleryPage: pageObject(
                galleryPage,
                [
                    ["eyebrow", "eyebrow"], ["title", "title"], ["description", "description"], ["categoriesEyebrow", "categories_eyebrow"],
                    ["categoriesTitle", "categories_title"], ["categoriesDescription", "categories_description"], ["featuredEyebrow", "featured_eyebrow"],
                    ["latestEyebrow", "latest_eyebrow"], ["latestTitle", "latest_title"], ["momentsEyebrow", "moments_eyebrow"],
                    ["momentsTitle", "moments_title"], ["emptyTitle", "empty_title"], ["emptyText", "empty_text"], ["pageSize", "page_size"],
                ],
                [["showSearch", "show_search"], ["showFilters", "show_filters"]],
                "galleryPage",
            ),
            gallery: {
                categories: (categories || []).map((row) => {
                    const item = keep({
                        id: row.public_id,
                        slug: row.slug,
                        title: row.title,
                        description: row.description,
                        icon: row.icon,
                        coverImage: row.cover_image,
                        coverAlt: row.cover_alt,
                    });
                    item.type = row.category_type === "people" ? "people" : "albums";
                    item.isPublished = on(row.is_published, true);
                    return withSeo(seoByOwner, "gallery_category", row.public_id, item);
                }),
                albums: albumItems,
                staff: people(false),
                founders: people(true),
            },
            eBrochuresPage: pageObject(
                brochuresPage,
                [
                    ["eyebrow", "eyebrow"], ["title", "title"], ["description", "description"], ["emptyTitle", "empty_title"],
                    ["emptyText", "empty_text"], ["searchEmptyTitle", "search_empty_title"], ["searchEmptyText", "search_empty_text"],
                ],
                [["showSearch", "show_search"], ["showFilters", "show_filters"]],
                "eBrochuresPage",
            ),
            eBrochures: (brochures || []).map((row) => {
                const item = keep({
                    id: row.public_id,
                    slug: row.slug,
                    title: row.title,
                    description: row.description,
                    fileUrl: row.file_url,
                    fileType: row.file_type,
                    fileSize: row.file_size,
                    year: row.year_label,
                    language: row.language,
                    badge: row.badge,
                    courseName: row.course_name,
                    courseDescription: row.course_description,
                    courseImage: row.course_image,
                    coverImage: row.cover_image,
                    coverAlt: row.cover_alt,
                });
                if (row.page_count) item.pageCount = Number(row.page_count);
                item.isPublished = on(row.is_published, true);
                return withSeo(seoByOwner, "brochure", row.public_id, item);
            }),
            contactPage: pageObject(contact, [["eyebrow", "eyebrow"], ["title", "title"], ["description", "description"]], [], "contactPage"),
        };
        })
        .catch((error) => {
            logger.error(`getSahasWebsite: ${error}`);
            return false;
        });
}

module.exports = { getSahasWebsite };
