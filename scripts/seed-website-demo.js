require("dotenv").config();
const mysql = require("mysql2/promise");
const path = require("path");
const { pathToFileURL } = require("url");

function emptyToNull(value) {
    if (value === undefined || value === null) return null;
    if (typeof value === "string" && value.trim() === "") return null;
    return value;
}

function flag(value, fallback = 0) {
    if (value === undefined || value === null || value === "") return fallback;
    return value === true || value === 1 || value === "1" ? 1 : 0;
}

function lines(items) {
    return items.filter(Boolean).join("\n") || null;
}

function slugify(value) {
    return String(value || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 70);
}

async function insertRow(connection, table, row) {
    const columns = Object.keys(row);
    const values = columns.map((column) => (row[column] === undefined ? null : row[column]));
    const placeholders = columns.map(() => "?").join(", ");
    await connection.query(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`, values);
}

async function insertSeo(connection, ownerType, ownerKey, seo) {
    if (!seo) return;
    await insertRow(connection, "WEBSITE_SEO", {
        owner_type: ownerType,
        owner_key: ownerKey,
        title: emptyToNull(seo.title),
        description: emptyToNull(seo.description),
        keywords: emptyToNull(seo.keywords),
        canonical_url: emptyToNull(seo.canonicalUrl),
        og_title: emptyToNull(seo.ogTitle),
        og_description: emptyToNull(seo.ogDescription),
        og_image: emptyToNull(seo.ogImage),
        no_index: seo.noIndex ? 1 : 0,
        twitter_title: emptyToNull(seo.twitterTitle),
        twitter_description: emptyToNull(seo.twitterDescription),
    });
}

async function main() {
    const demoPath = path.resolve(__dirname, "../../sahas_landing/libs/demo-data.js");
    const { DEMO_WEBSITE_DATA: data } = await import(pathToFileURL(demoPath).href);
    const home = data.home || {};
    const about = data.aboutPage || {};
    const facilitiesPage = data.facilitiesPage || {};
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_DB_HOST,
        user: process.env.MYSQL_DB_USERNAME,
        password: process.env.MYSQL_DB_PASSWORD,
        database: process.env.MYSQL_DB_NAME,
        dateStrings: true,
    });

    const tables = [
        "WEBSITE_COURSE_FEATURES",
        "WEBSITE_COURSES",
        "WEBSITE_BRANCHES",
        "WEBSITE_FACILITIES",
        "WEBSITE_NOTIFICATION_IMAGES",
        "WEBSITE_NOTIFICATION_FILES",
        "WEBSITE_NOTIFICATIONS",
        "WEBSITE_TESTIMONIALS",
        "WEBSITE_SOCIAL_LINKS",
        "WEBSITE_STATS",
        "WEBSITE_HOME_HIGHLIGHTS",
        "WEBSITE_HOME_APP_FEATURES",
        "WEBSITE_HOME_ACHIEVEMENTS",
        "WEBSITE_HOME_GALLERY_TILES",
        "WEBSITE_HOME_BROCHURE_CARDS",
        "WEBSITE_GALLERY_MEDIA",
        "WEBSITE_GALLERY_ALBUMS",
        "WEBSITE_GALLERY_CATEGORIES",
        "WEBSITE_BROCHURES",
        "WEBSITE_LINKS",
        "WEBSITE_SEO",
        "WEBSITE_PAGE_HOME",
        "WEBSITE_PAGE_ABOUT",
        "WEBSITE_PAGE_CONTACT",
        "WEBSITE_PAGE_COURSES",
        "WEBSITE_PAGE_FACILITIES",
        "WEBSITE_PAGE_NOTIFICATIONS",
        "WEBSITE_PAGE_GALLERY",
        "WEBSITE_PAGE_BROCHURES",
        "WEBSITE_SETTINGS",
    ];

    try {
        await connection.beginTransaction();
        for (const table of tables) {
            await connection.query(`DELETE FROM ${table}`);
        }

        const site = data.siteSettings || {};
        const header = data.header || {};
        const footer = data.footer || {};
        const mobile = data.mobileCta || {};
        await insertRow(connection, "WEBSITE_SETTINGS", {
            id: 1,
            site_name: emptyToNull(site.name),
            site_tagline: emptyToNull(site.tagline),
            site_logo: emptyToNull(site.logo),
            site_phone: emptyToNull(site.phone),
            site_whatsapp: emptyToNull(site.whatsapp),
            site_email: emptyToNull(site.email),
            header_logo: emptyToNull(header.logo),
            header_brand_name: emptyToNull(header.brandName),
            header_brand_tagline: emptyToNull(header.brandTagline),
            header_phone: emptyToNull(header.phone),
            header_cta_url: emptyToNull(header.ctaUrl),
            footer_description: emptyToNull(footer.description),
            footer_copyright: emptyToNull(footer.copyright),
            mobile_whatsapp: emptyToNull(mobile.whatsapp),
            mobile_phone: emptyToNull(mobile.phone),
            mobile_courses_url: emptyToNull(mobile.coursesUrl),
            mobile_app_url: emptyToNull(mobile.appUrl),
        });

        const hero = home.hero || {};
        const aboutTeaser = home.about || {};
        const founder = home.founder || {};
        const facilitiesIntro = home.facilities || {};
        const coursesIntro = home.courses || {};
        const app = home.app || {};
        const mission = home.mission || {};
        const vision = home.vision || {};
        const testimonialsPage = home.testimonialsPage || {};
        const freeContent = home.freeContent || {};
        const follow = home.contact || {};
        const statsMeta = Array.isArray(home.stats) ? {} : home.stats || {};
        await insertRow(connection, "WEBSITE_PAGE_HOME", {
            id: 1,
            hero_badge: emptyToNull(hero.badge),
            hero_badge_secondary: emptyToNull(hero.badgeSecondary),
            hero_title: emptyToNull(hero.title),
            hero_highlighted_text: emptyToNull(hero.highlightedText),
            hero_description: emptyToNull(hero.description),
            hero_image: emptyToNull(hero.image),
            hero_image_alt: emptyToNull(hero.imageAlt),
            hero_primary_text: emptyToNull(hero.primaryButton?.text),
            hero_primary_url: emptyToNull(hero.primaryButton?.url),
            hero_secondary_url: emptyToNull(hero.secondaryButton?.url),
            hero_float_top: emptyToNull(hero.floatTop),
            hero_float_bottom: emptyToNull(hero.floatBottom),
            stats_eyebrow: emptyToNull(statsMeta.eyebrow),
            stats_title: emptyToNull(statsMeta.title),
            about_eyebrow: emptyToNull(aboutTeaser.eyebrow),
            about_title: emptyToNull(aboutTeaser.title),
            about_description: emptyToNull(aboutTeaser.description),
            about_image: emptyToNull(aboutTeaser.image),
            about_image_alt: emptyToNull(aboutTeaser.alt || aboutTeaser.imageAlt),
            about_cta_text: emptyToNull(aboutTeaser.ctaText),
            about_cta_url: emptyToNull(aboutTeaser.ctaUrl),
            founder_name: emptyToNull(founder.name),
            founder_designation: emptyToNull(founder.designation),
            founder_image: emptyToNull(founder.image),
            founder_image_alt: emptyToNull(founder.imageAlt),
            founder_message: emptyToNull(founder.message),
            founder_description: emptyToNull(founder.description),
            founder_biography: emptyToNull(founder.biography),
            founder_quote: emptyToNull(founder.quote),
            founder_cta_text: emptyToNull(founder.ctaText),
            founder_cta_url: emptyToNull(founder.ctaUrl),
            founder_is_visible: founder && Object.keys(founder).length ? flag(founder.isVisible, 1) : null,
            facilities_eyebrow: emptyToNull(facilitiesIntro.eyebrow),
            facilities_title: emptyToNull(facilitiesIntro.title),
            facilities_description: emptyToNull(facilitiesIntro.description),
            facilities_view_all_text: emptyToNull(facilitiesIntro.viewAllText),
            facilities_view_all_url: emptyToNull(facilitiesIntro.viewAllUrl),
            courses_eyebrow: emptyToNull(coursesIntro.eyebrow),
            courses_title: emptyToNull(coursesIntro.title),
            courses_description: emptyToNull(coursesIntro.description),
            courses_view_all_text: emptyToNull(coursesIntro.viewAllText),
            courses_view_all_url: emptyToNull(coursesIntro.viewAllUrl),
            app_eyebrow: emptyToNull(app.eyebrow),
            app_title: emptyToNull(app.title),
            app_description: emptyToNull(app.description),
            app_image: emptyToNull(app.image),
            app_image_alt: emptyToNull(app.alt || app.imageAlt),
            app_android_url: emptyToNull(app.androidUrl),
            app_ios_url: emptyToNull(app.iosUrl),
            app_store_label: emptyToNull(app.secondaryButtonText),
            mission_title: emptyToNull(mission.title),
            mission_text: emptyToNull(mission.text || mission.content),
            mission_icon: emptyToNull(mission.icon),
            mission_is_visible: mission.title ? flag(mission.isVisible, 1) : null,
            vision_title: emptyToNull(vision.title),
            vision_text: emptyToNull(vision.text || vision.content),
            vision_icon: emptyToNull(vision.icon),
            vision_is_visible: vision.title ? flag(vision.isVisible, 1) : null,
            testimonials_eyebrow: emptyToNull(testimonialsPage.eyebrow),
            testimonials_title: emptyToNull(testimonialsPage.title),
            testimonials_description: emptyToNull(testimonialsPage.description),
            testimonials_trust_label: emptyToNull(testimonialsPage.trustLabel),
            free_title: emptyToNull(freeContent.title),
            free_description: emptyToNull(freeContent.description),
            free_items: lines((freeContent.items || []).map((item) => [item.icon || "", item.title || "", item.description || ""].join(" | "))),
            follow_title: emptyToNull(follow.title),
            follow_description: emptyToNull(follow.description),
        });

        const contact = data.contactPage || {};
        await insertRow(connection, "WEBSITE_PAGE_CONTACT", {
            id: 1,
            eyebrow: emptyToNull(contact.eyebrow),
            title: emptyToNull(contact.title),
            description: emptyToNull(contact.description),
        });

        const coursesPage = data.coursesPage || {};
        await insertRow(connection, "WEBSITE_PAGE_COURSES", {
            id: 1,
            eyebrow: emptyToNull(coursesPage.eyebrow),
            title: emptyToNull(coursesPage.title),
            description: emptyToNull(coursesPage.description),
            intro_title: emptyToNull(coursesPage.introTitle),
            intro_text: emptyToNull(coursesPage.introText),
            show_search: flag(coursesPage.showSearch, 1),
            show_filters: flag(coursesPage.showFilters, 1),
            cta_title: emptyToNull(coursesPage.ctaTitle),
            cta_description: emptyToNull(coursesPage.ctaDescription),
            cta_primary_text: emptyToNull(coursesPage.ctaPrimaryText),
            cta_primary_url: emptyToNull(coursesPage.ctaPrimaryUrl),
            cta_secondary_url: emptyToNull(coursesPage.ctaSecondaryUrl),
        });

        await insertRow(connection, "WEBSITE_PAGE_FACILITIES", {
            id: 1,
            eyebrow: emptyToNull(facilitiesPage.eyebrow),
            title: emptyToNull(facilitiesPage.title),
            description: emptyToNull(facilitiesPage.description),
            intro_eyebrow: emptyToNull(facilitiesPage.introEyebrow),
            intro_title: emptyToNull(facilitiesPage.introTitle),
            intro_text: emptyToNull(facilitiesPage.introText),
            carousel_eyebrow: emptyToNull(facilitiesPage.carouselEyebrow),
            carousel_title: emptyToNull(facilitiesPage.carouselTitle),
            carousel_description: emptyToNull(facilitiesPage.carouselDescription),
            show_filters: flag(facilitiesPage.showFilters, 1),
            ecosystem_title: emptyToNull(facilitiesPage.ecosystemTitle),
            ecosystem_description: emptyToNull(facilitiesPage.ecosystemDescription),
            closing_brand: emptyToNull(facilitiesPage.closingBrand),
            cta_title: emptyToNull(facilitiesPage.ctaTitle),
            cta_primary_text: emptyToNull(facilitiesPage.ctaPrimaryText),
            cta_primary_url: emptyToNull(facilitiesPage.ctaPrimaryUrl),
            cta_secondary_url: emptyToNull(facilitiesPage.ctaSecondaryUrl),
            float_title: lines((facilitiesPage.heroFloats || []).map((item) => item.label || item)),
            line_title: lines(facilitiesPage.closingLines || []),
        });

        const notificationsPage = data.notificationsPage || {};
        await insertRow(connection, "WEBSITE_PAGE_NOTIFICATIONS", {
            id: 1,
            eyebrow: emptyToNull(notificationsPage.eyebrow),
            title: emptyToNull(notificationsPage.title),
            description: emptyToNull(notificationsPage.description),
            list_eyebrow: emptyToNull(notificationsPage.listEyebrow),
            list_title: emptyToNull(notificationsPage.listTitle),
            list_description: emptyToNull(notificationsPage.listDescription),
            empty_title: emptyToNull(notificationsPage.emptyTitle),
            empty_text: emptyToNull(notificationsPage.emptyText),
            search_empty_title: emptyToNull(notificationsPage.searchEmptyTitle),
            search_empty_text: emptyToNull(notificationsPage.searchEmptyText),
            load_more_text: emptyToNull(notificationsPage.loadMoreText),
            page_size: notificationsPage.pageSize || null,
            show_search: flag(notificationsPage.showSearch, 1),
            show_filters: flag(notificationsPage.showFilters, 1),
            show_sort: flag(notificationsPage.showSort, 1),
        });

        const galleryPage = data.galleryPage || {};
        await insertRow(connection, "WEBSITE_PAGE_GALLERY", {
            id: 1,
            eyebrow: emptyToNull(galleryPage.eyebrow),
            title: emptyToNull(galleryPage.title),
            description: emptyToNull(galleryPage.description),
            categories_eyebrow: emptyToNull(galleryPage.categoriesEyebrow),
            categories_title: emptyToNull(galleryPage.categoriesTitle),
            categories_description: emptyToNull(galleryPage.categoriesDescription),
            featured_eyebrow: emptyToNull(galleryPage.featuredEyebrow),
            latest_eyebrow: emptyToNull(galleryPage.latestEyebrow),
            latest_title: emptyToNull(galleryPage.latestTitle),
            moments_eyebrow: emptyToNull(galleryPage.momentsEyebrow),
            moments_title: emptyToNull(galleryPage.momentsTitle),
            empty_title: emptyToNull(galleryPage.emptyTitle),
            empty_text: emptyToNull(galleryPage.emptyText),
            page_size: galleryPage.pageSize || null,
            show_search: flag(galleryPage.showSearch, 1),
            show_filters: flag(galleryPage.showFilters, 1),
        });

        const brochuresPage = data.eBrochuresPage || {};
        await insertRow(connection, "WEBSITE_PAGE_BROCHURES", {
            id: 1,
            eyebrow: emptyToNull(brochuresPage.eyebrow),
            title: emptyToNull(brochuresPage.title),
            description: emptyToNull(brochuresPage.description),
            empty_title: emptyToNull(brochuresPage.emptyTitle),
            empty_text: emptyToNull(brochuresPage.emptyText),
            search_empty_title: emptyToNull(brochuresPage.searchEmptyTitle),
            search_empty_text: emptyToNull(brochuresPage.searchEmptyText),
            show_search: flag(brochuresPage.showSearch, 1),
            show_filters: flag(brochuresPage.showFilters, 1),
        });

        await insertRow(connection, "WEBSITE_PAGE_ABOUT", {
            id: 1,
            eyebrow: emptyToNull(about.eyebrow),
            title: emptyToNull(about.title),
            description: emptyToNull(about.description),
            image: emptyToNull(about.image),
            image_alt: emptyToNull(about.imageAlt),
            show_history: about.historyText ? 1 : 0,
            history_eyebrow: emptyToNull(about.historyEyebrow),
            history_title: emptyToNull(about.historyTitle),
            history_text: emptyToNull(about.historyText),
            show_journey: (about.journeySteps || []).length ? 1 : 0,
            journey_eyebrow: emptyToNull(about.journeyEyebrow),
            journey_title: emptyToNull(about.journeyTitle),
            journey_description: emptyToNull(about.journeyDescription),
            show_founder: about.showFounder ? 1 : 0,
            show_founder_placeholder: about.founderPlaceholderText ? 1 : 0,
            founder_placeholder_title: emptyToNull(about.founderPlaceholderTitle),
            founder_placeholder_text: emptyToNull(about.founderPlaceholderText),
            show_academic: about.academicTitle || (about.courseOverview || []).length ? 1 : 0,
            academic_eyebrow: emptyToNull(about.academicEyebrow),
            academic_title: emptyToNull(about.academicTitle),
            academic_description: emptyToNull(about.academicDescription),
            show_mission_vision: about.showMissionVision ? 1 : 0,
            show_philosophy: (about.philosophy || []).length ? 1 : 0,
            philosophy_eyebrow: emptyToNull(about.philosophyEyebrow),
            philosophy_title: emptyToNull(about.philosophyTitle),
            philosophy_description: emptyToNull(about.philosophyDescription),
            show_map: about.mapTitle ? 1 : 0,
            map_eyebrow: emptyToNull(about.mapEyebrow),
            map_title: emptyToNull(about.mapTitle),
            map_description: emptyToNull(about.mapDescription),
            show_online: about.onlineTitle ? 1 : 0,
            online_eyebrow: emptyToNull(about.onlineEyebrow),
            online_title: emptyToNull(about.onlineTitle),
            online_description: emptyToNull(about.onlineDescription),
            online_image: emptyToNull(about.onlineImage),
            online_cta_url: emptyToNull(about.onlineCtaUrl),
            show_social: about.socialTitle ? 1 : 0,
            social_eyebrow: emptyToNull(about.socialEyebrow),
            social_title: emptyToNull(about.socialTitle),
            social_description: emptyToNull(about.socialDescription),
            show_brand: about.brandLine1 || about.brandLine2 ? 1 : 0,
            brand_line_1: emptyToNull(about.brandLine1),
            brand_line_2: emptyToNull(about.brandLine2),
            highlights: lines((about.highlights || []).map((item) => `${item.value || ""} | ${item.label || ""}`)),
            journey: lines((about.journeySteps || []).map((item) => `${item.year || ""} | ${item.title || ""} | ${item.description || ""}`)),
            learning: lines((about.learningModes || []).map((item) => `${item.icon || ""} | ${item.title || ""} | ${item.description || ""}`)),
            philosophy: lines((about.philosophy || []).map((item) => `${item.icon || ""} | ${item.title || ""} | ${item.description || ""}`)),
            course_overview: lines(about.courseOverview || []),
        });

        await insertSeo(connection, "site", "site", data.seo);
        await insertSeo(connection, "page", "contactPage", contact.seo);
        await insertSeo(connection, "page", "eBrochuresPage", brochuresPage.seo);
        await insertSeo(connection, "page", "coursesPage", coursesPage.seo);
        await insertSeo(connection, "page", "facilitiesPage", facilitiesPage.seo);
        await insertSeo(connection, "page", "aboutPage", about.seo);
        await insertSeo(connection, "page", "notificationsPage", notificationsPage.seo);
        await insertSeo(connection, "page", "galleryPage", galleryPage.seo);
        await insertSeo(connection, "page", "home.hero", hero.seo);
        await insertSeo(connection, "page", "home.about", aboutTeaser.seo);
        await insertSeo(connection, "page", "home.courses", coursesIntro.seo);
        await insertSeo(connection, "page", "home.app", app.seo);
        await insertSeo(connection, "page", "home.mission", mission.seo);
        await insertSeo(connection, "page", "home.vision", vision.seo);
        await insertSeo(connection, "page", "home.testimonialsPage", testimonialsPage.seo);

        for (const link of header.navigation || []) {
            await insertRow(connection, "WEBSITE_LINKS", { group_key: "header", label: link.label, href: link.href, icon: emptyToNull(link.icon) });
        }
        for (const link of footer.quickLinks || []) {
            await insertRow(connection, "WEBSITE_LINKS", { group_key: "footer_quick", label: link.label, href: link.href, icon: emptyToNull(link.icon) });
        }
        for (const link of footer.legalLinks || []) {
            await insertRow(connection, "WEBSITE_LINKS", { group_key: "footer_legal", label: link.label, href: link.href, icon: emptyToNull(link.icon) });
        }

        for (const branch of data.branches || []) {
            await insertRow(connection, "WEBSITE_BRANCHES", {
                public_id: String(branch.id || branch.slug),
                slug: branch.slug || slugify(branch.name),
                name: branch.name,
                label: emptyToNull(branch.label),
                description: emptyToNull(branch.description),
                address: emptyToNull(branch.address),
                phone: emptyToNull(branch.phone),
                whatsapp: emptyToNull(branch.whatsapp),
                map_url: emptyToNull(branch.mapUrl),
                map_embed_url: emptyToNull(branch.mapEmbedUrl),
                map_query: emptyToNull(branch.mapQuery),
                city: emptyToNull(branch.city),
                state: emptyToNull(branch.state),
                country: emptyToNull(branch.country),
                latitude: branch.latitude ?? null,
                longitude: branch.longitude ?? null,
                is_active: flag(branch.isActive, 1),
            });
        }

        for (const course of data.courses || []) {
            const publicId = String(course.id || course.slug);
            const price = course.price === "" || course.price === null || course.price === undefined ? null : Number(course.price);
            await insertRow(connection, "WEBSITE_COURSES", {
                public_id: publicId,
                slug: course.slug || slugify(course.title),
                title: course.title,
                subtitle: emptyToNull(course.subtitle),
                short_description: emptyToNull(course.shortDescription),
                description: emptyToNull(course.description),
                category: emptyToNull(course.category),
                board: emptyToNull(course.board),
                university: emptyToNull(course.university),
                medium: emptyToNull(course.medium),
                duration: emptyToNull(course.duration),
                badge: emptyToNull(course.badge),
                price: Number.isFinite(price) && price !== 0 ? price : null,
                price_label: emptyToNull(course.priceLabel),
                image: emptyToNull(course.image),
                image_alt: emptyToNull(course.imageAlt),
                brochure_url: emptyToNull(course.brochureUrl),
                cta_text: emptyToNull(course.ctaText),
                enquiry_url: emptyToNull(course.enquiryUrl),
                detail_url: emptyToNull(course.detailUrl),
                featured: flag(course.featured),
                is_active: flag(course.isActive, 1),
            });
            for (const feature of course.features || []) {
                await insertRow(connection, "WEBSITE_COURSE_FEATURES", {
                    course_public_id: publicId,
                    icon: emptyToNull(feature.icon),
                    title: feature.title,
                });
            }
            await insertSeo(connection, "course", publicId, course.seo);
        }

        for (const facility of facilitiesIntro.items || []) {
            const publicId = String(facility.id || facility.slug);
            await insertRow(connection, "WEBSITE_FACILITIES", {
                public_id: publicId,
                slug: facility.slug || slugify(facility.title),
                title: facility.title,
                description: emptyToNull(facility.description),
                icon: emptyToNull(facility.icon),
                image: emptyToNull(facility.image),
                image_alt: emptyToNull(facility.imageAlt),
                category: emptyToNull(facility.category),
                badge: emptyToNull(facility.badge),
                detail_url: emptyToNull(facility.detailUrl),
                featured: flag(facility.featured),
                special: flag(facility.special),
                is_active: flag(facility.isActive, 1),
                points: lines((facility.features || []).map((feature) => feature.title || feature)),
            });
        }

        for (const notice of home.notifications || []) {
            const publicId = String(notice.id || notice.slug);
            await insertRow(connection, "WEBSITE_NOTIFICATIONS", {
                public_id: publicId,
                slug: notice.slug || slugify(notice.title),
                title: notice.title,
                category: emptyToNull(notice.category),
                course: emptyToNull(notice.course),
                description: emptyToNull(notice.description),
                content: emptyToNull(notice.content),
                image: emptyToNull(notice.image),
                image_alt: emptyToNull(notice.imageAlt),
                thumbnail: emptyToNull(notice.thumbnail),
                pdf_url: emptyToNull(notice.pdfUrl),
                pdf_title: emptyToNull(notice.pdfTitle),
                pdf_size: emptyToNull(notice.pdfSize),
                video_url: emptyToNull(notice.videoUrl),
                video_thumbnail: emptyToNull(notice.videoThumbnail),
                published_at: emptyToNull(notice.publishedAt),
                is_featured: flag(notice.isFeatured),
                is_important: flag(notice.isImportant),
                is_new: notice.isNew === undefined ? null : flag(notice.isNew),
                cta_text: emptyToNull(notice.ctaText),
                cta_url: emptyToNull(notice.ctaUrl),
                tags: emptyToNull(Array.isArray(notice.tags) ? notice.tags.join(", ") : notice.tags),
                is_published: flag(notice.isPublished, 1),
            });
            for (const image of notice.images || []) {
                await insertRow(connection, "WEBSITE_NOTIFICATION_IMAGES", {
                    notification_public_id: publicId,
                    url: image.url || image,
                    alt_text: emptyToNull(image.alt || image.altText),
                });
            }
            for (const file of notice.attachments || notice.files || []) {
                await insertRow(connection, "WEBSITE_NOTIFICATION_FILES", {
                    notification_public_id: publicId,
                    title: emptyToNull(file.title),
                    url: file.url,
                    file_size: emptyToNull(file.fileSize || file.size),
                    file_type: emptyToNull(file.fileType || file.type),
                });
            }
            await insertSeo(connection, "notification", publicId, notice.seo);
        }

        for (const item of home.testimonials || []) {
            const publicId = String(item.id || slugify(item.name));
            await insertRow(connection, "WEBSITE_TESTIMONIALS", {
                public_id: publicId,
                name: emptyToNull(item.name),
                title: emptyToNull(item.title),
                description: emptyToNull(item.description),
                reviewer_type: emptyToNull(item.reviewerType),
                role: emptyToNull(item.role || item.class),
                course: emptyToNull(item.course),
                score: emptyToNull(item.score),
                rating: item.rating ?? null,
                image: emptyToNull(item.image),
                image_alt: emptyToNull(item.imageAlt),
                media_url: emptyToNull(item.mediaUrl),
                media_type: emptyToNull(item.mediaType),
                is_published: flag(item.isPublished, 1),
            });
        }

        for (const item of follow.social || []) {
            await insertRow(connection, "WEBSITE_SOCIAL_LINKS", {
                public_id: slugify(item.platform || item.url),
                platform: emptyToNull(item.platform),
                url: item.url,
                icon: emptyToNull(item.icon),
            });
        }

        const statItems = Array.isArray(home.stats) ? home.stats : home.stats?.items || [];
        for (const item of statItems) {
            await insertRow(connection, "WEBSITE_STATS", {
                value_text: item.value || item.valueText,
                label: emptyToNull(item.label),
                hint: emptyToNull(item.hint),
            });
        }

        for (const item of aboutTeaser.highlights || []) {
            await insertRow(connection, "WEBSITE_HOME_HIGHLIGHTS", {
                icon: emptyToNull(item.icon),
                title: emptyToNull(item.title),
                description: emptyToNull(item.description),
            });
        }
        for (const title of app.features || []) {
            await insertRow(connection, "WEBSITE_HOME_APP_FEATURES", { title });
        }
        for (const item of home.achievements || []) {
            await insertRow(connection, "WEBSITE_HOME_ACHIEVEMENTS", {
                category: emptyToNull(item.category),
                value_text: emptyToNull(item.value),
                title: emptyToNull(item.title),
                meta: emptyToNull(item.meta),
            });
        }
        for (const item of home.galleryPreview || []) {
            await insertRow(connection, "WEBSITE_HOME_GALLERY_TILES", {
                title: emptyToNull(item.title),
                description: emptyToNull(item.description),
                icon: emptyToNull(item.icon),
                image: emptyToNull(item.image),
                alt_text: emptyToNull(item.alt),
                link_url: emptyToNull(item.link),
            });
        }
        for (const item of home.brochures || []) {
            await insertRow(connection, "WEBSITE_HOME_BROCHURE_CARDS", {
                title: emptyToNull(item.title),
                description: emptyToNull(item.description),
                file_url: emptyToNull(item.pdfUrl || item.fileUrl),
                link_url: emptyToNull(item.detailUrl),
            });
        }

        const gallery = data.gallery || {};
        for (const category of gallery.categories || []) {
            const publicId = String(category.id || category.slug);
            await insertRow(connection, "WEBSITE_GALLERY_CATEGORIES", {
                public_id: publicId,
                slug: category.slug || slugify(category.title),
                title: category.title,
                description: emptyToNull(category.description),
                icon: emptyToNull(category.icon),
                category_type: category.type === "people" ? "people" : "albums",
                cover_image: emptyToNull(category.coverImage),
                cover_alt: emptyToNull(category.coverAlt),
                is_published: flag(category.isPublished, 1),
            });
            await insertSeo(connection, "gallery_category", publicId, category.seo);
        }

        async function insertAlbum(album, categorySlug, itemType) {
            const publicId = String(album.id || album.slug);
            await insertRow(connection, "WEBSITE_GALLERY_ALBUMS", {
                public_id: publicId,
                slug: album.slug || slugify(album.title || album.name),
                category_slug: categorySlug,
                title: album.title || album.name,
                description: emptyToNull(album.description),
                location: emptyToNull(album.location),
                event_date: emptyToNull(album.eventDate),
                cover_image: emptyToNull(album.coverImage || album.image),
                cover_alt: emptyToNull(album.coverAlt || album.imageAlt),
                is_featured: flag(album.isFeatured),
                is_published: flag(album.isPublished, 1),
                tags: emptyToNull(Array.isArray(album.tags) ? album.tags.join(", ") : album.tags),
                item_type: itemType,
                person_name: emptyToNull(album.name && itemType === "person" ? album.name : album.personName),
                designation: emptyToNull(album.designation),
                department: emptyToNull(album.department),
                experience: emptyToNull(album.experience),
                person_image: emptyToNull(album.image && itemType === "person" ? album.image : album.personImage),
                person_image_alt: emptyToNull(album.imageAlt),
            });
            for (const [index, media] of (album.media || []).entries()) {
                await insertRow(connection, "WEBSITE_GALLERY_MEDIA", {
                    public_id: `${publicId}-m${index + 1}`,
                    album_public_id: publicId,
                    media_type: media.type === "video" ? "video" : "image",
                    url: emptyToNull(media.url),
                    thumbnail: emptyToNull(media.thumbnail),
                    title: emptyToNull(media.title),
                    caption: emptyToNull(media.caption),
                    alt_text: emptyToNull(media.alt),
                    duration: emptyToNull(media.duration),
                    downloadable: flag(media.downloadable),
                });
            }
            await insertSeo(connection, "gallery_album", publicId, album.seo);
        }

        for (const album of gallery.albums || []) {
            await insertAlbum(album, album.categorySlug || album.categoryId || "events", "album");
        }
        for (const album of gallery.branches || []) {
            await insertAlbum(album, "branches-classrooms", "album");
        }
        for (const person of gallery.staff || []) {
            await insertAlbum(person, person.categorySlug || "staff-members", "person");
        }
        for (const person of gallery.founders || []) {
            await insertAlbum(person, person.categorySlug || "founders", "person");
        }

        for (const brochure of data.eBrochures || []) {
            const publicId = String(brochure.id || brochure.brochureId || slugify(brochure.title));
            await insertRow(connection, "WEBSITE_BROCHURES", {
                public_id: publicId,
                slug: slugify(brochure.title) || publicId,
                title: emptyToNull(brochure.title),
                description: emptyToNull(brochure.description),
                file_url: emptyToNull(brochure.fileUrl),
                file_type: emptyToNull(brochure.fileType),
                page_count: brochure.pageCount || null,
                file_size: emptyToNull(brochure.fileSize),
                year_label: emptyToNull(brochure.year),
                language: emptyToNull(brochure.language),
                badge: emptyToNull(brochure.badge),
                course_name: emptyToNull(brochure.courseName),
                course_description: emptyToNull(brochure.courseDescription),
                course_image: emptyToNull(brochure.courseImage),
                cover_image: emptyToNull(brochure.coverImage),
                cover_alt: emptyToNull(brochure.coverAlt),
                is_published: flag(brochure.isPublished, 1),
            });
            await insertSeo(connection, "brochure", publicId, brochure.seo);
        }

        await connection.commit();
        const [counts] = await connection.query(
            `SELECT
                (SELECT COUNT(*) FROM WEBSITE_SETTINGS) settings,
                (SELECT COUNT(*) FROM WEBSITE_COURSES) courses,
                (SELECT COUNT(*) FROM WEBSITE_BRANCHES) branches,
                (SELECT COUNT(*) FROM WEBSITE_FACILITIES) facilities,
                (SELECT COUNT(*) FROM WEBSITE_NOTIFICATIONS) notifications,
                (SELECT COUNT(*) FROM WEBSITE_GALLERY_ALBUMS) albums,
                (SELECT COUNT(*) FROM WEBSITE_GALLERY_MEDIA) media,
                (SELECT COUNT(*) FROM WEBSITE_BROCHURES) brochures,
                (SELECT COUNT(*) FROM WEBSITE_TESTIMONIALS) testimonials`
        );
        console.log(JSON.stringify(counts[0]));
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        await connection.end();
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error.message || error);
        process.exit(1);
    });
