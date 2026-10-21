// config/database.js
const mysql = require("mysql2");
const { logger } = require("sahas_utils");

// Create a connection pool
const dbConnectionPool = mysql.createPool({
    host: process.env.MYSQL_DB_HOST, // MySQL server address (could be an IP address or 'localhost')
    user: process.env.MYSQL_DB_USERNAME, // MySQL username
    password: process.env.MYSQL_DB_PASSWORD, // MySQL password
    database: process.env.MYSQL_DB_NAME, // Name of the database
    waitForConnections: true, // Enable queuing of requests if the pool is busy
    connectionLimit: 10, // Max number of connections in the pool
    queueLimit: 0, // Unlimited number of requests in the queue -1
    dateStrings: true,
});

async function generateDBTables() {
    const createUserTableQuery = [
        `CREATE TABLE IF NOT EXISTS USERS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            full_name VARCHAR(36) NULL,
            email VARCHAR(48) NULL UNIQUE,
            phone VARCHAR(13) NULL UNIQUE,
            guardian_phone VARCHAR(13) NULL,
            guardian_email VARCHAR(48) NULL,
            dob DATE NULL,
            image VARCHAR(64) NULL UNIQUE,
            address VARCHAR(256) NULL,
            branch_id INT NULL,
            stream_selection_test_allowed BOOLEAN NOT NULL DEFAULT FALSE,
            active BOOLEAN NOT NULL DEFAULT TRUE,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_by INT NULL
          )
        `,
        `CREATE TABLE IF NOT EXISTS USER_HISTORY (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            institute VARCHAR(64) NULL,
            course VARCHAR(64) NULL,
            course_exam_seat VARCHAR(64) NULL,
            refered_by VARCHAR(64) NULL,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_history_user
                FOREIGN KEY (user_id)
                REFERENCES USERS(id)
                ON DELETE CASCADE
                ON UPDATE CASCADE
          )
        `,
        `CREATE TABLE IF NOT EXISTS WALLET_TRANSACTIONS(
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            amount INT NOT NULL,
            note VARCHAR(256) NOT NULL,
            created_by INT NULL,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
        `CREATE TABLE IF NOT EXISTS ROLES(
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(36) UNIQUE NOT NULL,
            active BOOLEAN NOT NULL DEFAULT TRUE,
            created_by INT NULL,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS AUTHORITIES(
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(72) UNIQUE NOT NULL,
            description VARCHAR(128) NOT NULL,
            created_by INT NULL,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS ROLE_AUTHORITIES(
            id INT AUTO_INCREMENT PRIMARY KEY,
            role_id INT NOT NULL,
            authority_id INT NOT NULL,
            created_by INT  NULL,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_role_authority (role_id, authority_id)
        )`,
        `CREATE TABLE IF NOT EXISTS USER_ROLES(
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            role_id INT NOT NULL,
            created_by INT NULL,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_role (user_id, role_id)
            )`,
        `CREATE TABLE IF NOT EXISTS AUTHENTICATION_TOKENS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            otp VARCHAR(4) NULL,
            token VARCHAR(36) NULL UNIQUE,
            active BOOLEAN NOT NULL DEFAULT FALSE,
            validity DATETIME NOT NULL,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP
          )`,
        `CREATE TABLE IF NOT EXISTS USER_DEVICES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            finger_print VARCHAR(256) NOT NULL,
            active BOOLEAN NOT NULL DEFAULT TRUE,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_device (user_id, finger_print)
          )`,
        `CREATE TABLE IF NOT EXISTS BRANCHES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(56) NOT NULL,
            address VARCHAR(128) NOT NULL,
            description VARCHAR(256) NOT NULL,
            active BOOLEAN NOT NULL DEFAULT TRUE,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `,
        `CREATE TABLE IF NOT EXISTS INQUIRIES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            created_by INT NOT NULL,
            branch_id INT NOT NULL,
            course_id INT NOT NULL,
            active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS INQUIRY_NOTES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            inquiry_id INT NOT NULL,
            note VARCHAR(256) NOT NULL,
            created_by INT NOT NULL,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_INQUIRIES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            full_name VARCHAR(100) NOT NULL,
            phone VARCHAR(20) NOT NULL,
            branch_slug VARCHAR(80) NULL,
            branch_name VARCHAR(160) NULL,
            course_slug VARCHAR(80) NULL,
            course_title VARCHAR(160) NULL,
            description TEXT NULL,
            source VARCHAR(32) NOT NULL DEFAULT 'website',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_website_inquiries_created (created_at),
            INDEX idx_website_inquiries_phone (phone)
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_SETTINGS (
            id TINYINT PRIMARY KEY,
            site_name VARCHAR(160) NULL,
            site_tagline VARCHAR(160) NULL,
            site_logo VARCHAR(512) NULL,
            site_phone VARCHAR(32) NULL,
            site_whatsapp VARCHAR(512) NULL,
            site_email VARCHAR(160) NULL,
            header_logo VARCHAR(512) NULL,
            header_brand_name VARCHAR(80) NULL,
            header_brand_tagline VARCHAR(160) NULL,
            header_phone VARCHAR(32) NULL,
            header_cta_url VARCHAR(512) NULL,
            footer_description TEXT NULL,
            footer_copyright VARCHAR(256) NULL,
            mobile_whatsapp VARCHAR(512) NULL,
            mobile_phone VARCHAR(32) NULL,
            mobile_courses_url VARCHAR(512) NULL,
            mobile_app_url VARCHAR(512) NULL,
            updated_by INT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_PAGE_HOME (
            id TINYINT PRIMARY KEY,
            hero_badge VARCHAR(160) NULL,
            hero_badge_secondary VARCHAR(160) NULL,
            hero_title TEXT NULL,
            hero_highlighted_text VARCHAR(256) NULL,
            hero_description TEXT NULL,
            hero_image VARCHAR(512) NULL,
            hero_image_alt VARCHAR(256) NULL,
            hero_primary_text VARCHAR(160) NULL,
            hero_primary_url VARCHAR(512) NULL,
            hero_secondary_url VARCHAR(512) NULL,
            hero_float_top VARCHAR(160) NULL,
            hero_float_bottom VARCHAR(160) NULL,
            stats_eyebrow VARCHAR(160) NULL,
            stats_title VARCHAR(256) NULL,
            about_eyebrow VARCHAR(160) NULL,
            about_title VARCHAR(256) NULL,
            about_description TEXT NULL,
            about_image VARCHAR(512) NULL,
            about_image_alt VARCHAR(256) NULL,
            about_cta_text VARCHAR(160) NULL,
            about_cta_url VARCHAR(512) NULL,
            founder_name VARCHAR(160) NULL,
            founder_designation VARCHAR(160) NULL,
            founder_image VARCHAR(512) NULL,
            founder_image_alt VARCHAR(256) NULL,
            founder_message TEXT NULL,
            founder_description TEXT NULL,
            founder_biography TEXT NULL,
            founder_quote TEXT NULL,
            founder_cta_text VARCHAR(160) NULL,
            founder_cta_url VARCHAR(512) NULL,
            founder_is_visible BOOLEAN NULL,
            facilities_eyebrow VARCHAR(160) NULL,
            facilities_title VARCHAR(256) NULL,
            facilities_description TEXT NULL,
            facilities_view_all_text VARCHAR(160) NULL,
            facilities_view_all_url VARCHAR(512) NULL,
            courses_eyebrow VARCHAR(160) NULL,
            courses_title VARCHAR(256) NULL,
            courses_description TEXT NULL,
            courses_view_all_text VARCHAR(160) NULL,
            courses_view_all_url VARCHAR(512) NULL,
            app_eyebrow VARCHAR(160) NULL,
            app_title VARCHAR(256) NULL,
            app_description TEXT NULL,
            app_image VARCHAR(512) NULL,
            app_image_alt VARCHAR(256) NULL,
            app_android_url VARCHAR(512) NULL,
            app_ios_url VARCHAR(512) NULL,
            app_store_label VARCHAR(160) NULL,
            mission_title VARCHAR(160) NULL,
            mission_text TEXT NULL,
            mission_icon VARCHAR(80) NULL,
            mission_is_visible BOOLEAN NULL,
            vision_title VARCHAR(160) NULL,
            vision_text TEXT NULL,
            vision_icon VARCHAR(80) NULL,
            vision_is_visible BOOLEAN NULL,
            testimonials_eyebrow VARCHAR(160) NULL,
            testimonials_title VARCHAR(256) NULL,
            testimonials_description TEXT NULL,
            testimonials_trust_label VARCHAR(160) NULL,
            free_title VARCHAR(256) NULL,
            free_description TEXT NULL,
            free_items TEXT NULL,
            follow_title VARCHAR(256) NULL,
            follow_description TEXT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_PAGE_ABOUT (
            id TINYINT PRIMARY KEY,
            eyebrow VARCHAR(160) NULL,
            title TEXT NULL,
            description TEXT NULL,
            image VARCHAR(512) NULL,
            image_alt VARCHAR(256) NULL,
            show_history BOOLEAN NULL,
            history_eyebrow VARCHAR(160) NULL,
            history_title VARCHAR(256) NULL,
            history_text TEXT NULL,
            show_journey BOOLEAN NULL,
            journey_eyebrow VARCHAR(160) NULL,
            journey_title VARCHAR(256) NULL,
            journey_description TEXT NULL,
            show_founder BOOLEAN NULL,
            show_founder_placeholder BOOLEAN NULL,
            founder_placeholder_title VARCHAR(256) NULL,
            founder_placeholder_text TEXT NULL,
            show_academic BOOLEAN NULL,
            academic_eyebrow VARCHAR(160) NULL,
            academic_title VARCHAR(256) NULL,
            academic_description TEXT NULL,
            show_mission_vision BOOLEAN NULL,
            show_philosophy BOOLEAN NULL,
            philosophy_eyebrow VARCHAR(160) NULL,
            philosophy_title VARCHAR(256) NULL,
            philosophy_description TEXT NULL,
            show_map BOOLEAN NULL,
            map_eyebrow VARCHAR(160) NULL,
            map_title VARCHAR(256) NULL,
            map_description TEXT NULL,
            show_online BOOLEAN NULL,
            online_eyebrow VARCHAR(160) NULL,
            online_title VARCHAR(256) NULL,
            online_description TEXT NULL,
            online_image VARCHAR(512) NULL,
            online_cta_url VARCHAR(512) NULL,
            show_social BOOLEAN NULL,
            social_eyebrow VARCHAR(160) NULL,
            social_title VARCHAR(256) NULL,
            social_description TEXT NULL,
            show_brand BOOLEAN NULL,
            brand_line_1 VARCHAR(256) NULL,
            brand_line_2 VARCHAR(256) NULL,
            highlights TEXT NULL,
            journey TEXT NULL,
            learning TEXT NULL,
            philosophy TEXT NULL,
            course_overview TEXT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_PAGE_CONTACT (
            id TINYINT PRIMARY KEY,
            eyebrow VARCHAR(160) NULL,
            title VARCHAR(256) NULL,
            description TEXT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_PAGE_COURSES (
            id TINYINT PRIMARY KEY,
            eyebrow VARCHAR(160) NULL,
            title VARCHAR(256) NULL,
            description TEXT NULL,
            intro_title VARCHAR(256) NULL,
            intro_text TEXT NULL,
            show_search BOOLEAN NULL,
            show_filters BOOLEAN NULL,
            cta_title VARCHAR(256) NULL,
            cta_description TEXT NULL,
            cta_primary_text VARCHAR(160) NULL,
            cta_primary_url VARCHAR(512) NULL,
            cta_secondary_url VARCHAR(512) NULL
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_PAGE_FACILITIES (
            id TINYINT PRIMARY KEY,
            eyebrow VARCHAR(160) NULL,
            title TEXT NULL,
            description TEXT NULL,
            intro_eyebrow VARCHAR(160) NULL,
            intro_title VARCHAR(256) NULL,
            intro_text TEXT NULL,
            carousel_eyebrow VARCHAR(160) NULL,
            carousel_title VARCHAR(256) NULL,
            carousel_description TEXT NULL,
            show_filters BOOLEAN NULL,
            ecosystem_title VARCHAR(256) NULL,
            ecosystem_description TEXT NULL,
            closing_brand VARCHAR(80) NULL,
            cta_title VARCHAR(256) NULL,
            cta_primary_text VARCHAR(160) NULL,
            cta_primary_url VARCHAR(512) NULL,
            cta_secondary_url VARCHAR(512) NULL,
            float_title TEXT NULL,
            line_title TEXT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_PAGE_NOTIFICATIONS (
            id TINYINT PRIMARY KEY,
            eyebrow VARCHAR(160) NULL,
            title VARCHAR(256) NULL,
            description TEXT NULL,
            list_eyebrow VARCHAR(160) NULL,
            list_title VARCHAR(256) NULL,
            list_description TEXT NULL,
            empty_title VARCHAR(256) NULL,
            empty_text TEXT NULL,
            search_empty_title VARCHAR(256) NULL,
            search_empty_text TEXT NULL,
            load_more_text VARCHAR(160) NULL,
            page_size INT NULL,
            show_search BOOLEAN NULL,
            show_filters BOOLEAN NULL,
            show_sort BOOLEAN NULL
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_PAGE_GALLERY (
            id TINYINT PRIMARY KEY,
            eyebrow VARCHAR(160) NULL,
            title VARCHAR(256) NULL,
            description TEXT NULL,
            categories_eyebrow VARCHAR(160) NULL,
            categories_title VARCHAR(256) NULL,
            categories_description TEXT NULL,
            featured_eyebrow VARCHAR(160) NULL,
            latest_eyebrow VARCHAR(160) NULL,
            latest_title VARCHAR(256) NULL,
            moments_eyebrow VARCHAR(160) NULL,
            moments_title VARCHAR(256) NULL,
            empty_title VARCHAR(256) NULL,
            empty_text TEXT NULL,
            page_size INT NULL,
            show_search BOOLEAN NULL,
            show_filters BOOLEAN NULL
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_PAGE_BROCHURES (
            id TINYINT PRIMARY KEY,
            eyebrow VARCHAR(160) NULL,
            title VARCHAR(256) NULL,
            description TEXT NULL,
            empty_title VARCHAR(256) NULL,
            empty_text TEXT NULL,
            search_empty_title VARCHAR(256) NULL,
            search_empty_text TEXT NULL,
            show_search BOOLEAN NULL,
            show_filters BOOLEAN NULL
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_FIELDS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            section_key VARCHAR(64) NOT NULL,
            field_key VARCHAR(64) NOT NULL,
            field_value MEDIUMTEXT NULL,
            UNIQUE KEY unique_website_field (section_key, field_key)
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_SEO (
            id INT AUTO_INCREMENT PRIMARY KEY,
            owner_type VARCHAR(32) NOT NULL,
            owner_key VARCHAR(80) NOT NULL,
            title VARCHAR(256) NULL,
            description TEXT NULL,
            keywords VARCHAR(512) NULL,
            canonical_url VARCHAR(512) NULL,
            og_title VARCHAR(256) NULL,
            og_description TEXT NULL,
            og_image VARCHAR(512) NULL,
            no_index BOOLEAN NOT NULL DEFAULT FALSE,
            twitter_title VARCHAR(256) NULL,
            twitter_description TEXT NULL,
            UNIQUE KEY unique_website_seo (owner_type, owner_key)
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_LINKS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            group_key VARCHAR(32) NOT NULL,
            label VARCHAR(160) NOT NULL,
            href VARCHAR(512) NOT NULL,
            icon VARCHAR(80) NULL,
            INDEX idx_website_links_group (group_key)
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_BRANCHES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            public_id VARCHAR(80) NOT NULL,
            slug VARCHAR(80) NOT NULL,
            name VARCHAR(160) NOT NULL,
            label VARCHAR(80) NULL,
            description TEXT NULL,
            address TEXT NULL,
            phone VARCHAR(32) NULL,
            whatsapp VARCHAR(512) NULL,
            map_url VARCHAR(512) NULL,
            map_embed_url VARCHAR(512) NULL,
            map_query VARCHAR(256) NULL,
            city VARCHAR(80) NULL,
            state VARCHAR(80) NULL,
            country VARCHAR(16) NULL,
            latitude DECIMAL(10, 7) NULL,
            longitude DECIMAL(10, 7) NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            UNIQUE KEY unique_website_branch (public_id)
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_COURSES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            public_id VARCHAR(80) NOT NULL,
            slug VARCHAR(80) NOT NULL,
            title VARCHAR(256) NOT NULL,
            subtitle VARCHAR(256) NULL,
            short_description TEXT NULL,
            description TEXT NULL,
            category VARCHAR(80) NULL,
            board VARCHAR(80) NULL,
            university VARCHAR(80) NULL,
            medium VARCHAR(80) NULL,
            duration VARCHAR(80) NULL,
            badge VARCHAR(80) NULL,
            price DECIMAL(10, 2) NULL,
            price_label VARCHAR(80) NULL,
            image VARCHAR(512) NULL,
            image_alt VARCHAR(256) NULL,
            brochure_url VARCHAR(512) NULL,
            cta_text VARCHAR(160) NULL,
            enquiry_url VARCHAR(512) NULL,
            detail_url VARCHAR(512) NULL,
            featured BOOLEAN NOT NULL DEFAULT FALSE,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            UNIQUE KEY unique_website_course (public_id)
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_COURSE_FEATURES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            course_public_id VARCHAR(80) NOT NULL,
            icon VARCHAR(80) NULL,
            title VARCHAR(160) NOT NULL,
            INDEX idx_website_course_features (course_public_id)
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_FACILITIES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            public_id VARCHAR(80) NOT NULL,
            slug VARCHAR(80) NOT NULL,
            title VARCHAR(256) NOT NULL,
            description TEXT NULL,
            icon VARCHAR(80) NULL,
            image VARCHAR(512) NULL,
            image_alt VARCHAR(256) NULL,
            category VARCHAR(80) NULL,
            badge VARCHAR(80) NULL,
            detail_url VARCHAR(512) NULL,
            featured BOOLEAN NOT NULL DEFAULT FALSE,
            special BOOLEAN NOT NULL DEFAULT FALSE,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            points TEXT NULL,
            UNIQUE KEY unique_website_facility (public_id)
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_NOTIFICATIONS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            public_id VARCHAR(80) NOT NULL,
            slug VARCHAR(80) NOT NULL,
            title VARCHAR(256) NOT NULL,
            category VARCHAR(80) NULL,
            course VARCHAR(160) NULL,
            description TEXT NULL,
            content MEDIUMTEXT NULL,
            image VARCHAR(512) NULL,
            image_alt VARCHAR(256) NULL,
            thumbnail VARCHAR(512) NULL,
            pdf_url VARCHAR(512) NULL,
            pdf_title VARCHAR(160) NULL,
            pdf_size VARCHAR(40) NULL,
            video_url VARCHAR(512) NULL,
            video_thumbnail VARCHAR(512) NULL,
            published_at VARCHAR(40) NULL,
            is_featured BOOLEAN NOT NULL DEFAULT FALSE,
            is_important BOOLEAN NOT NULL DEFAULT FALSE,
            is_new BOOLEAN NULL,
            cta_text VARCHAR(160) NULL,
            cta_url VARCHAR(512) NULL,
            tags VARCHAR(256) NULL,
            is_published BOOLEAN NOT NULL DEFAULT TRUE,
            UNIQUE KEY unique_website_notification (public_id)
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_NOTIFICATION_IMAGES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            notification_public_id VARCHAR(80) NOT NULL,
            url VARCHAR(512) NOT NULL,
            alt_text VARCHAR(256) NULL,
            INDEX idx_website_notification_images (notification_public_id)
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_NOTIFICATION_FILES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            notification_public_id VARCHAR(80) NOT NULL,
            title VARCHAR(160) NULL,
            url VARCHAR(512) NOT NULL,
            file_size VARCHAR(40) NULL,
            file_type VARCHAR(32) NULL,
            INDEX idx_website_notification_files (notification_public_id)
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_TESTIMONIALS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            public_id VARCHAR(80) NOT NULL,
            name VARCHAR(160) NULL,
            title VARCHAR(256) NULL,
            description TEXT NULL,
            reviewer_type VARCHAR(80) NULL,
            role VARCHAR(160) NULL,
            course VARCHAR(160) NULL,
            score VARCHAR(40) NULL,
            rating DECIMAL(4, 1) NULL,
            image VARCHAR(512) NULL,
            image_alt VARCHAR(256) NULL,
            media_url VARCHAR(512) NULL,
            media_type VARCHAR(16) NULL,
            is_published BOOLEAN NOT NULL DEFAULT TRUE,
            UNIQUE KEY unique_website_testimonial (public_id)
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_SOCIAL_LINKS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            public_id VARCHAR(80) NOT NULL,
            platform VARCHAR(80) NULL,
            url VARCHAR(512) NOT NULL,
            icon VARCHAR(80) NULL,
            UNIQUE KEY unique_website_social (public_id)
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_STATS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            value_text VARCHAR(40) NOT NULL,
            label VARCHAR(160) NULL,
            hint VARCHAR(160) NULL
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_HOME_HIGHLIGHTS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            icon VARCHAR(80) NULL,
            title VARCHAR(256) NULL,
            description TEXT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_HOME_APP_FEATURES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(256) NULL
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_HOME_ACHIEVEMENTS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            category VARCHAR(160) NULL,
            value_text VARCHAR(256) NULL,
            title VARCHAR(256) NULL,
            meta VARCHAR(256) NULL
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_HOME_GALLERY_TILES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(256) NULL,
            description TEXT NULL,
            icon VARCHAR(80) NULL,
            image VARCHAR(512) NULL,
            alt_text VARCHAR(256) NULL,
            link_url VARCHAR(512) NULL
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_HOME_BROCHURE_CARDS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(256) NULL,
            description TEXT NULL,
            file_url VARCHAR(512) NULL,
            link_url VARCHAR(512) NULL
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_GALLERY_CATEGORIES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            public_id VARCHAR(80) NOT NULL,
            slug VARCHAR(80) NOT NULL,
            title VARCHAR(160) NOT NULL,
            description TEXT NULL,
            icon VARCHAR(80) NULL,
            category_type VARCHAR(16) NOT NULL DEFAULT 'albums',
            cover_image VARCHAR(512) NULL,
            cover_alt VARCHAR(256) NULL,
            is_published BOOLEAN NOT NULL DEFAULT TRUE,
            UNIQUE KEY unique_website_gallery_category (public_id)
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_GALLERY_ALBUMS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            public_id VARCHAR(80) NOT NULL,
            slug VARCHAR(80) NOT NULL,
            category_slug VARCHAR(80) NOT NULL,
            title VARCHAR(256) NOT NULL,
            description TEXT NULL,
            location VARCHAR(256) NULL,
            event_date VARCHAR(32) NULL,
            cover_image VARCHAR(512) NULL,
            cover_alt VARCHAR(256) NULL,
            is_featured BOOLEAN NOT NULL DEFAULT FALSE,
            is_published BOOLEAN NOT NULL DEFAULT TRUE,
            tags VARCHAR(256) NULL,
            item_type VARCHAR(16) NOT NULL DEFAULT 'album',
            person_name VARCHAR(160) NULL,
            designation VARCHAR(160) NULL,
            department VARCHAR(160) NULL,
            experience VARCHAR(80) NULL,
            person_image VARCHAR(512) NULL,
            person_image_alt VARCHAR(256) NULL,
            UNIQUE KEY unique_website_gallery_album (public_id),
            INDEX idx_website_gallery_albums_category (category_slug)
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_GALLERY_MEDIA (
            id INT AUTO_INCREMENT PRIMARY KEY,
            public_id VARCHAR(80) NOT NULL,
            album_public_id VARCHAR(80) NOT NULL,
            media_type VARCHAR(16) NOT NULL DEFAULT 'image',
            url VARCHAR(512) NULL,
            thumbnail VARCHAR(512) NULL,
            title VARCHAR(256) NULL,
            caption TEXT NULL,
            alt_text VARCHAR(256) NULL,
            duration VARCHAR(32) NULL,
            downloadable BOOLEAN NOT NULL DEFAULT FALSE,
            INDEX idx_website_gallery_media (album_public_id)
        )`,
        `CREATE TABLE IF NOT EXISTS WEBSITE_BROCHURES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            public_id VARCHAR(80) NOT NULL,
            slug VARCHAR(80) NULL,
            title VARCHAR(256) NULL,
            description TEXT NULL,
            file_url VARCHAR(512) NULL,
            file_type VARCHAR(32) NULL,
            page_count INT NULL,
            file_size VARCHAR(40) NULL,
            year_label VARCHAR(32) NULL,
            language VARCHAR(40) NULL,
            badge VARCHAR(40) NULL,
            course_name VARCHAR(160) NULL,
            course_description TEXT NULL,
            course_image VARCHAR(512) NULL,
            cover_image VARCHAR(512) NULL,
            cover_alt VARCHAR(256) NULL,
            is_published BOOLEAN NOT NULL DEFAULT TRUE,
            UNIQUE KEY unique_website_brochure (public_id)
        )`,
        `CREATE TABLE IF NOT EXISTS ENROLLMENTS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            end_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            amount DECIMAL(8, 2) DEFAULT 0,
            on_site_access BOOLEAN NOT NULL DEFAULT TRUE,
            digital_access BOOLEAN NOT NULL DEFAULT TRUE,
            handler  VARCHAR(256) NOT NULL,
            note VARCHAR(256) NULL,
            created_by INT NULL,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `,
        `CREATE TABLE IF NOT EXISTS ENROLLMENT_COURSES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            enrollment_id INT NOT NULL,
            course_id INT NOT NULL,
            created_by INT NULL,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_course (enrollment_id, course_id)
          )`,
        `CREATE TABLE IF NOT EXISTS ENROLLMENT_TRANSACTIONS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            enrollment_id INT NOT NULL,
            amount DECIMAL(8, 2) DEFAULT 0,
            cgst DECIMAL(8, 2) DEFAULT 0,
            sgst DECIMAL(8, 2) DEFAULT 0,
            original DECIMAL(8, 2) AS (amount - cgst - sgst) STORED,
            coupon_code VARCHAR(16) NULL,
            discount DECIMAL(8, 2) DEFAULT 0,
            note VARCHAR(256) NOT NULL,
            type VARCHAR(16) NOT NULL,
            image VARCHAR(128) NULL UNIQUE,
            invoice VARCHAR(128) NULL,
            manually_verified BOOLEAN NOT NULL DEFAULT FALSE,
            created_by INT NULL,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS COURSE_CATEGORIES(
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(96) NOT NULL UNIQUE,
            image VARCHAR(128) NULL,
            view_index INT NOT NULL DEFAULT 0,
            active BOOLEAN NOT NULL DEFAULT TRUE,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS COURSES(
            id INT AUTO_INCREMENT PRIMARY KEY,
            category_id INT NOT NULL,
            title VARCHAR(96) NOT NULL,
            description VARCHAR(256) NOT NULL,
            image VARCHAR(128) NULL,
            fees DECIMAL(8, 2) DEFAULT 0,
            whatsapp_group VARCHAR(128) NULL,
            validity INT NOT NULL DEFAULT 365,
            view_index INT NOT NULL DEFAULT 0,
            is_bundle BOOLEAN NOT NULL DEFAULT FALSE,
            active BOOLEAN NOT NULL DEFAULT TRUE,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_category_title (category_id, title)
        )`,
        `CREATE TABLE IF NOT EXISTS BUNDLED_COURSES(
            id INT AUTO_INCREMENT PRIMARY KEY,
            course_id INT NOT NULL,
            bundled_course_id INT NOT NULL,
            UNIQUE KEY unique_course_bundled_course (course_id, bundled_course_id)
        )`,
        `CREATE TABLE IF NOT EXISTS COURSE_CAROUSEL (
            id INT AUTO_INCREMENT PRIMARY KEY,
            course_id INT NOT NULL,
            source VARCHAR(512) NOT NULL,
            click_link VARCHAR(512) NULL,
            view_index INT NOT NULL DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS COURSE_DIALOG_CONTENTS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            course_id INT NOT NULL,
            content VARCHAR(512) NOT NULL,
            redirect_url VARCHAR(512) NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            daily BOOLEAN NOT NULL DEFAULT FALSE,
            frequency INT NOT NULL,
            active BOOLEAN NOT NULL DEFAULT TRUE,
            view_index INT NOT NULL DEFAULT 0,
            \`interval\` INT NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_course_dialog_content_course (course_id, view_index, active),
            INDEX idx_course_dialog_content_dates (start_date, end_date, active)
        )`,
        `CREATE TABLE IF NOT EXISTS COURSE_DIALOG_CONTENT_VIEWS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            content_id INT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_course_dialog_views_user_content (user_id, content_id),
            INDEX idx_course_dialog_views_content_created (content_id, created_at)
        )`,
        `CREATE TABLE IF NOT EXISTS EXAM_DIALOG_CONTENTS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            course_id INT NOT NULL,
            content VARCHAR(512) NOT NULL,
            redirect_url VARCHAR(512) NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            daily BOOLEAN NOT NULL DEFAULT FALSE,
            frequency INT NOT NULL,
            active BOOLEAN NOT NULL DEFAULT TRUE,
            view_index INT NOT NULL DEFAULT 0,
            \`interval\` INT NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_exam_dialog_content_course (course_id, view_index, active),
            INDEX idx_exam_dialog_content_dates (start_date, end_date, active)
        )`,
        `CREATE TABLE IF NOT EXISTS EXAM_DIALOG_CONTENT_VIEWS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            content_id INT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_exam_dialog_views_user_content (user_id, content_id),
            INDEX idx_exam_dialog_views_content_created (content_id, created_at)
        )`,
        `CREATE TABLE IF NOT EXISTS DASHBOARD_DIALOG_CONTENTS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            content VARCHAR(512) NOT NULL,
            redirect_url VARCHAR(512) NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            daily BOOLEAN NOT NULL DEFAULT FALSE,
            frequency INT NOT NULL,
            active BOOLEAN NOT NULL DEFAULT TRUE,
            view_index INT NOT NULL DEFAULT 0,
            \`interval\` INT NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_dashboard_dialog_content_order (view_index, active),
            INDEX idx_dashboard_dialog_content_dates (start_date, end_date, active)
        )`,
        `CREATE TABLE IF NOT EXISTS DASHBOARD_DIALOG_CONTENT_VIEWS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            content_id INT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_dashboard_dialog_views_user_content (user_id, content_id),
            INDEX idx_dashboard_dialog_views_content_created (content_id, created_at)
        )`,
        `CREATE TABLE IF NOT EXISTS SELF_TEST_DIALOG_CONTENTS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            content VARCHAR(512) NOT NULL,
            redirect_url VARCHAR(512) NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            daily BOOLEAN NOT NULL DEFAULT FALSE,
            frequency INT NOT NULL,
            active BOOLEAN NOT NULL DEFAULT TRUE,
            view_index INT NOT NULL DEFAULT 0,
            \`interval\` INT NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_self_test_dialog_content_order (view_index, active),
            INDEX idx_self_test_dialog_content_dates (start_date, end_date, active)
        )`,
        `CREATE TABLE IF NOT EXISTS SELF_TEST_DIALOG_CONTENT_VIEWS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            content_id INT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_self_test_dialog_views_user_content (user_id, content_id),
            INDEX idx_self_test_dialog_views_content_created (content_id, created_at)
        )`,
        `CREATE TABLE IF NOT EXISTS SUBJECTS(
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(96) NOT NULL,
            background_color VARCHAR(32) DEFAULT NULL,
            test_timer_minutes INT DEFAULT NULL,
            test_size INT DEFAULT NULL,
            active BOOLEAN NOT NULL DEFAULT TRUE,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS COURSE_SUBJECTS(
            id INT AUTO_INCREMENT PRIMARY KEY,
            course_id INT NOT NULL,
            subject_id INT NOT NULL,
            view_index INT NOT NULL DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_course_subject (course_id, subject_id)
        )`,
        `CREATE TABLE IF NOT EXISTS SUBJECT_CHAPTERS(
            id INT AUTO_INCREMENT PRIMARY KEY,
            subject_id INT NOT NULL,
            title VARCHAR(128) NOT NULL,
            type INT NOT NULL,
            test_attainable BOOL DEFAULT FALSE,
            test_questions_pool VARCHAR(128) NULL UNIQUE,
            view_index INT NOT NULL DEFAULT 0,
            active BOOLEAN NOT NULL DEFAULT TRUE,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_subject_title (subject_id, title)
        )`,
        `CREATE TABLE IF NOT EXISTS CHAPTER_TYPES(
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(128) NOT NULL UNIQUE,
            view_index INT NULL,
            requires_enrollment_digital_access BOOLEAN DEFAULT TRUE,
            active BOOLEAN NOT NULL DEFAULT TRUE,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS COUPON_CODES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(16) UNIQUE,
            active BOOLEAN NOT NULL DEFAULT TRUE,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS COUPON_CODE_COURSES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            coupon_code_id INT NOT NULL,
            course_id INT NOT NULL,
            discount DECIMAL(8, 2) NOT NULL DEFAULT 0,
            discount_type VARCHAR(12) DEFAULT '₹',
            distributor_email VARCHAR(48)  NULL,
            commision DECIMAL(8, 2) NOT NULL DEFAULT 0,
            commision_type VARCHAR(12)  DEFAULT '₹',
            validity_days INT  NOT NULL DEFAULT 365,
            validity_date DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
            validity_type VARCHAR(12) DEFAULT 'DAYS',
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS CHAPTER_MEDIA (
            id INT AUTO_INCREMENT PRIMARY KEY,
            chapter_id INT NOT NULL,
            title VARCHAR(96) NOT NULL,
            cdn_url VARCHAR(128) NOT NULL,
            type VARCHAR(16) NOT NULL,
            external_url VARCHAR(128) NULL,
            downloadable BOOLEAN NOT NULL DEFAULT FALSE,
            view_index INT NOT NULL DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_chapter_type_title (chapter_id,type, title)
        )`,
        `CREATE TABLE IF NOT EXISTS GLOBAL_NOTES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            note VARCHAR(256) NOT NULL,
            type VARCHAR(255) DEFAULT NULL,
            attachment VARCHAR(512) DEFAULT NULL,
            created_by INT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_global_notes_user
                FOREIGN KEY (user_id)
                REFERENCES USERS(id)
                ON DELETE CASCADE
                ON UPDATE CASCADE,
            CONSTRAINT fk_global_notes_created_by
                FOREIGN KEY (created_by)
                REFERENCES USERS(id)
                ON DELETE CASCADE
                ON UPDATE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS COUNSELING_NOTES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            note VARCHAR(256) NOT NULL,
            type VARCHAR(255) DEFAULT NULL,
            attachment VARCHAR(512) DEFAULT NULL,
            created_by INT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_counseling_notes_user
                FOREIGN KEY (user_id)
                REFERENCES USERS(id)
                ON DELETE CASCADE
                ON UPDATE CASCADE,
            CONSTRAINT fk_counseling_notes_created_by
                FOREIGN KEY (created_by)
                REFERENCES USERS(id)
                ON DELETE CASCADE
                ON UPDATE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS POLICIES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL UNIQUE,
            description VARCHAR(1024) NOT NULL,
            view_index INT NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS EXAM_SERIES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(96) NOT NULL UNIQUE,
            course_id INT NOT NULL,
            fees DECIMAL(8, 2) NOT NULL DEFAULT 0,
            start_at DATETIME NOT NULL,
            end_at DATETIME NOT NULL,
            active BOOLEAN NOT NULL DEFAULT FALSE,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS EXAMS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            exam_series_id INT NOT NULL,
            subject_id INT NOT NULL,
            title VARCHAR(128) NOT NULL,
            start_at DATETIME NOT NULL,
            end_at DATETIME NOT NULL,
            positive_marks DECIMAL(10,2) NOT NULL DEFAULT 1,
            negative_marks DECIMAL(10,2) NOT NULL DEFAULT -1,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS EXAM_QUESTIONS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            exam_id INT NOT NULL,
            question VARCHAR(512) NOT NULL,
            choice_one VARCHAR(256) NOT NULL,
            choice_two VARCHAR(256) NOT NULL,
            choice_three VARCHAR(256) NOT NULL,
            choice_four VARCHAR(256) NOT NULL,
            correct_choice VARCHAR(256) NOT NULL,
            media_url VARCHAR(512) DEFAULT NULL,
            created_by INT NULL,
            updated_by INT NULL,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS EXAM_SERIES_ENROLLMENTS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            exam_series_id INT NOT NULL,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_exam_series (user_id, exam_series_id)
        )`,
        `CREATE TABLE IF NOT EXISTS EXAM_CANDIDATURE (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            exam_id INT NOT NULL,
            identity VARCHAR(512) NOT NULL,
            selfie VARCHAR(512) NOT NULL,
            interruptions INT NOT NULL DEFAULT 0,
            submitted_on DATETIME NULL,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_exam (user_id, exam_id)
        )`,
        `CREATE TABLE IF NOT EXISTS EXAM_SUBMISSIONS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            exam_id INT NOT NULL,
            question_id INT NOT NULL,
            submitted_answer VARCHAR(256) NOT NULL,
            marks DECIMAL(10,2) NOT NULL DEFAULT 0,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_exam_question (user_id, exam_id, question_id)
        )`,
        `CREATE TABLE IF NOT EXISTS STREAM_SELECTION_QUESTION_CATEGORIES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL UNIQUE,
            active BOOLEAN NOT NULL DEFAULT TRUE,
            view_index INT NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS STREAM_SELECTION_QUESTIONS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            category_id INT NOT NULL,
            question VARCHAR(255) NOT NULL UNIQUE,
            media_url VARCHAR(128) NULL UNIQUE,
            view_index INT NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
             CONSTRAINT fk_category_question
                FOREIGN KEY (category_id)
                REFERENCES STREAM_SELECTION_QUESTION_CATEGORIES(id)
                ON DELETE CASCADE
                ON UPDATE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS STREAM_SELECTION_TESTS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            result VARCHAR(512) NULL,
            report_url VARCHAR(255) NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS STREAM_SELECTION_TEST_ANSWERS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            stream_selection_test_id INT NOT NULL,
            question VARCHAR(255) NOT NULL,
            answer VARCHAR(255) NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS STREAM_SELECTION_QUESTION_OPTIONS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            question_id INT NOT NULL,
            \`option\` VARCHAR(255) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_question_option (question_id, \`option\`),
              CONSTRAINT fk_question_option
                FOREIGN KEY (question_id)
                REFERENCES STREAM_SELECTION_QUESTIONS(id)
                ON DELETE CASCADE
                ON UPDATE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS STREAM_SELECTION_TEST_INVITES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(128) NOT NULL UNIQUE,
            active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS STREAM_SELECTION_SUGGESTIONS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL UNIQUE,
            pdf VARCHAR(255) NOT NULL UNIQUE,
            view_index INT NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS CONFIGS (
            config_key VARCHAR(64) PRIMARY KEY,
            config_value VARCHAR(512) NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS DASHBOARD_CAROUSEL_ITEMS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            source VARCHAR(512) NOT NULL,
            click_link VARCHAR(512) NULL,
            view_index INT NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS BATCHES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(96) NOT NULL,
            description VARCHAR(512) NULL,
            branch_id INT NULL,
            start_date DATE NULL,
            end_date DATE NULL,
            active BOOLEAN NOT NULL DEFAULT TRUE,
            created_by INT NULL,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS BATCH_USERS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            batch_id INT NOT NULL,
            user_id INT NOT NULL,
            roll_no INT NULL,
            created_by INT NULL,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_batch_user (batch_id, user_id),
            INDEX idx_batch_users_batch (batch_id),
            INDEX idx_batch_users_user (user_id)
        )`,
        `CREATE TABLE IF NOT EXISTS BATCH_ATTENDANCE (
            id INT AUTO_INCREMENT PRIMARY KEY,
            batch_id INT NOT NULL,
            user_id INT NOT NULL,
            attendance_date DATE NOT NULL,
            status ENUM('PRESENT', 'ABSENT') NOT NULL,
            created_by INT NULL,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_batch_user_date (batch_id, user_id, attendance_date),
            INDEX idx_batch_attendance_batch_date (batch_id, attendance_date)
        )`,
        `CREATE TABLE IF NOT EXISTS BATCH_CONTROLLERS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            batch_id INT NOT NULL,
            user_id INT NOT NULL,
            created_by INT NULL,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_batch_controller (batch_id, user_id),
            INDEX idx_batch_controllers_batch (batch_id),
            INDEX idx_batch_controllers_user (user_id)
        )`,
        `CREATE TABLE IF NOT EXISTS BATCH_SCHEDULE (
            id INT AUTO_INCREMENT PRIMARY KEY,
            batch_id INT NOT NULL,
            weekday TINYINT NOT NULL,
            start_time TIME NULL,
            end_time TIME NULL,
            subject VARCHAR(128) NULL,
            event_handler INT NULL,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_batch_weekday (batch_id, weekday),
            INDEX idx_batch_schedule_batch (batch_id),
            INDEX idx_batch_schedule_handler (event_handler)
        )`,
        `CREATE TABLE IF NOT EXISTS BATCH_EVENTS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(128) NOT NULL,
            description VARCHAR(1024) NULL,
            start_at DATETIME NOT NULL,
            end_at DATETIME NOT NULL,
            branch_id INT NULL,
            cancelled BOOLEAN NOT NULL DEFAULT FALSE,
            created_by INT NULL,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_batch_events_start (start_at),
            INDEX idx_batch_events_branch (branch_id)
        )`,
        `CREATE TABLE IF NOT EXISTS BATCH_EVENT_BATCHES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            batch_event_id INT NOT NULL,
            batch_id INT NOT NULL,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_batch_event_batch (batch_event_id, batch_id),
            INDEX idx_batch_event_batches_event (batch_event_id),
            INDEX idx_batch_event_batches_batch (batch_id)
        )`,
        `CREATE TABLE IF NOT EXISTS USER_EVENTS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            title VARCHAR(128) NOT NULL,
            description VARCHAR(1024) NULL,
            start_at DATETIME NOT NULL,
            end_at DATETIME NOT NULL,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_user_events_user (user_id),
            INDEX idx_user_events_start (start_at)
        )`,
        `CREATE TABLE IF NOT EXISTS USER_TASK_STATUSES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(64) NOT NULL UNIQUE,
            color VARCHAR(32) NOT NULL DEFAULT '#E5E7EB',
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS USER_TASKS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(128) NOT NULL,
            description VARCHAR(1024) NULL,
            user_id INT NOT NULL,
            status_id INT NOT NULL,
            priority TINYINT NOT NULL DEFAULT 0,
            attachment VARCHAR(512) NULL,
            deadline DATETIME NULL,
            created_by INT NOT NULL,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_user_tasks_user (user_id),
            INDEX idx_user_tasks_created_by (created_by),
            INDEX idx_user_tasks_status (status_id),
            INDEX idx_user_tasks_priority (priority),
            INDEX idx_user_tasks_created_on (created_on),
            INDEX idx_user_tasks_deadline (deadline)
        )`,
        `CREATE TABLE IF NOT EXISTS USER_TASK_COMMENTS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            task_id INT NOT NULL,
            comment VARCHAR(1024) NOT NULL,
            attachment VARCHAR(512) NULL,
            created_by INT NOT NULL,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_user_task_comments_task (task_id),
            INDEX idx_user_task_comments_created_by (created_by)
        )`,
        `CREATE TABLE IF NOT EXISTS NOTIFICATION_TYPES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(64) NOT NULL UNIQUE,
            color VARCHAR(32) NOT NULL DEFAULT '#E5E7EB',
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS NOTIFICATIONS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT NULL,
            type_id INT NOT NULL,
            seen TINYINT(1) NOT NULL DEFAULT 0,
            created_by INT NULL,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_notifications_user (user_id),
            INDEX idx_notifications_user_seen (user_id, seen),
            INDEX idx_notifications_type (type_id)
        )`,
        `CREATE TABLE IF NOT EXISTS NOTIFICATION_ATTACHMENTS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            notification_id INT NOT NULL,
            attachment VARCHAR(512) NOT NULL,
            created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_notif_attachments_notification (notification_id)
        )`,

        `INSERT IGNORE INTO CONFIGS (config_key, config_value) VALUES
        ('under_maintenance', 'false'),
        ('auth_otp_validity', '5'),
        ('auth_token_validity', '30'),
        ('payment_cgst', '9'),
        ('payment_sgst', '9'),
        ('stream_selection_fees', '99'),
        ('stream_selection_external_attendees', 'true')`,

        `INSERT IGNORE INTO BRANCHES (id, title, address, description, active, created_on, updated_at) VALUES
        (1, 'Head Office', '123 Main Street, Mumbai', 'Main corporate branch', 1, '2025-08-10 23:05:32', '2025-08-10 23:05:32'),
        (2, 'Ahmedabad Branch', '45 Riverfront Road, Ahmedabad', 'Serves Gujarat region', 1, '2025-08-10 23:05:32', '2025-08-10 23:05:32'),
        (3, 'Bangalore Branch', '88 MG Road, Bangalore', 'South India operations', 1, '2025-08-10 23:05:32', '2025-08-10 23:05:32')`,

        `INSERT IGNORE INTO USER_TASK_STATUSES (id, title, color) VALUES
        (1, 'Open', '#DBEAFE'),
        (2, 'In Progress', '#FEF3C7'),
        (3, 'Completed', '#D1FAE5'),
        (4, 'Cancelled', '#FEE2E2')`,

        `INSERT IGNORE INTO NOTIFICATION_TYPES (id, title, color) VALUES
        (1, 'Notice', '#DBEAFE'),
        (2, 'Alert', '#FEF3C7'),
        (3, 'Warning', '#FEE2E2')`,

        `INSERT IGNORE INTO AUTHORITIES (title, description) VALUES
        ('MANAGE_OTHER_USERS', 'Manage Other User Profile'),
        ('MANAGE_COURSES', 'Manage Course Content'),

        ('MANAGE_USER_INQUIRIES', 'Manage User Inquiries'),
        ('CREATE_CAROUSEL', 'Create Carousel Items'),
        ('DELETE_CAROUSEL', 'Delete Carousel Items'),
        ('USE_EMPLOYEE_CORNER', 'Employee Corner Visibility'),
        ('USE_PAGE_MY_EXPENSES', 'Page For Expense Submission'),
        ('USE_PAGE_MANAGE_EXAMS', 'Page For Exam Paper'),
        ('CREATE_EXAM_SERIES', 'Create Exam Series'),
        ('UPDATE_EXAM_SERIES', 'Update Exam Series'),
        ('CREATE_EXAM', 'Create Exam'),
        ('UPDATE_EXAM', 'Update Exam'),
        ('DELETE_EXAM', 'Delete Exam'),
        ('CREATE_EXAM_QUESTION', 'Create Exam Question'),
        ('UPDATE_EXAM_QUESTION', 'Update Exam Question'),
        ('DELETE_EXAM_QUESTION', 'Delete Exam Question'),
        ('MANAGE_EXAM_ENROLLMENTS', 'Manage Exam Series Enrollments'),
        ('USE_PAGE_MANAGE_BATCHES', 'Page For Managing Batches'),
        ('CREATE_BATCH', 'Create Batch'),
        ('UPDATE_BATCH', 'Update Batch'),
        ('DELETE_BATCH', 'Delete Batch'),
        ('ASSIGN_BATCH_STUDENT', 'Assign Student To Batch'),
        ('MANAGE_BATCH_ATTENDANCE', 'Manage Batch Attendance'),
        ('MANAGE_BATCH_CONTROLLER', 'Manage Batch Controllers'),
        ('USE_PAGE_MANAGE_EVENTS', 'Page For Managing Batch Events'),
        ('CREATE_BATCH_EVENT', 'Create Batch Event'),
        ('UPDATE_BATCH_EVENT', 'Update Batch Event'),
        ('DELETE_BATCH_EVENT', 'Delete Batch Event'),
        ('USE_PAGE_TASKS', 'Page For Managing Tasks'),
        ('CREATE_USER_TASK', 'Create User Task'),
        ('READ_ALL_USER_TASKS', 'Read All User Tasks'),
        ('DELETE_USER_TASK', 'Delete User Task'),
        ('USE_ADMIN_CORNER', 'Admin Corner Visibility'),
        ('USE_PAGE_MANAGE_BRANCHES', 'Page For Managing Branches'),
        ('CREATE_BRANCH', 'Create Branch'),
        ('UPDATE_BRANCH', 'Update Branch'),
        ('DELETE_BRANCH', 'Delete Branch'),
        ('USE_PAGE_MANAGE_STREAMING_DEVICES_REQUESTS', 'Page For Managing Streaming Device Requests'),
        ('USE_PAGE_FINANCIALS', 'Page For Managing Financials'),
        ('USE_PAGE_ANALYTICS', 'Page For Analytics'),
        ('USE_PAGE_CHAPTERIZATION', 'Page For Managing Chapter Types'),
        ('USE_PAGE_COUPON_CODES', 'Page For Managing Coupon Codes'),
        ('USE_DEVELOPER_CORNER', 'Developer Corner Visibility'),
        ('USE_CONTAINER_MANAGE_USERS', 'Use User Management Container'),
        ('USE_PAGE_USERS', 'Use User Search Page'),
        ('USE_CONTAINER_USER', 'Use User Profile Container'),
        ('WRIE_USER_BASICS', 'Write User Basic Profile'),
        ('READ_USER_STREAMING_DEVICES', 'View User Streaming Devices'),
        ('READ_USER_WALLET', 'View User Wallet'),
        ('READ_USER_GLOBAL_NOTES', 'View User Global Notes'),
        ('READ_USER_COUNSELING_NOTES', 'View User Counseling Notes'),

        ('CREATE_GLOBAL_NOTE', 'Create Global Note'),
        ('READ_GLOBAL_NOTE', 'Read Global Note'),
        ('UPDATE_GLOBAL_NOTE', 'Update Global Note'),
        ('DELETE_GLOBAL_NOTE', 'Delete Global Note'),

        ('CREATE_COUNSELING_NOTE', 'Create Counseling Note'),
        ('READ_COUNSELING_NOTE', 'Read Counseling Note'),
        ('UPDATE_COUNSELING_NOTE', 'Update Counseling Note'),
        ('DELETE_COUNSELING_NOTE', 'Delete Counseling Note'),

        ('READ_CHAPTERS_TEST','View Chapter Tests'),
        ('DELETE_CHAPTERS','Delete Chapters'),
        ('UPDATE_CHAPTERS_VIEW_INDEXES','Update Chapters View Indexes'),
        ('READ_CHAPTERS_MEDIA','View Chapters Media'),
        ('UPDATE_CHAPTERS','Update Chapters'),
        ('CREATE_CHAPTERS','Create Chapters'),
        ('READ_CHAPTERS','Read Chapters'),


        ('UPDATE_USER','Update User'),
        ('CREATE_USER','Create User'),
        ('READ_USER','View User'),
        ('READ_USER_ENROLLMENT_COURSES','View User Enrollment Courses'),
        ('READ_USER_CHAPTERS_TEST_CATALOGUE','View User Enrollment Course Subjects'),
        ('READ_USER_INQUIRIES','View User Inquiries'),
        ('READ_USER_ENROLLMENTS','View User Enrollments'),
        ('READ_USER_DEVICES','View User Devices'),
        ('READ_USER_WALLET_TRANSACTIONS','View User Wallet Transactions'),
        ('READ_USER_ROLES','View User Roles'),
        ('CREATE_USER_ROLES','Create User Roles'),
        ('DELETE_USER_ROLES','Delete User Roles'),

        ('UPDATE_SUBJECTS','Update Subjects'),
        ('READ_SUBJECTS','View Subjects'),
        ('READ_SUBJECTS_CHAPTERS','View Subjects and its Chapters'),
        ('CREATE_COURSE_SUBJECTS','Create Course Subjects'),

        ('DELETE_ROLES','Delete Roles User Roles and Role Authorities'),
        ('READ_ROLES_AUTHORITIES','View Roles Authorities'),
        ('UPDATE_ROLES','Update Roles'),
        ('CREATE_ROLES','Create Roles'),

        ('CREATE_ROLES_AUTHORITIES','Create Roles Authorities'),
        ('DELETE_ROLES_AUTHORITIES','Delete Roles Authorities'),

        ('CREATE_MEDIA','Create Media'),
        ('UPDATE_MEDIA','Update Media'),
        ('DELETE_MEDIA','Delete Media'),
        ('READ_MEDIA','View Media'),

        ('CREATE_WALLET_TRANSACTION','Create Wallet Transaction'),
        
        ('CREATE_INQUIRY_NOTE','Create Inquiry Note'),
        ('DELETE_INQUIRY_NOTE','Delete Inquiry Note'),

        ('CREATE_INQUIRY','Create Inquiry and Inquiry Note'),
        ('UPDATE_INQUIRY','Update Inquiry'),
        ('DELETE_INQUIRY','Delete Inquiry and Inquiry Note'),
        ('READ_INQUIRY_NOTE','View Inquiry Note'),

        ('UPDATE_ENROLLMENT','Update Enrollment'),
        ('CREATE_ENROLLMENT','Create Enrollment'),
        ('READ_ENROLLMENT_TRANSACTION','View Enrollment Transaction'),
        ('READ_ENROLLMENT_COURSE','View Enrollment Courses'),
        
        ('READ_ENROLLMENT_SUMMARY','View Enrollment Summary'),
        ('CREATE_ENROLLMENT_TRANSACTION','Create Enrollment Transaction and Generate Invoice'),
        
        ('CREATE_ENROLLMENT_COURSE','Create Enrollment Course'),
        ('DELETE_ENROLLMENT_COURSE','Delete Enrollment Course'),
        
        ('UPDATE_USER_DEVICE','Update User Device'),
        
        ('CREATE_COURSE','Create Course'),
        ('DELETE_COURSE','Delete Course'),
        ('UPDATE_COURSE_VIEW_INDEX','Update Course View Index'),
        ('UPDATE_COURSE','Update Course'),
        ('READ_COURSE','View Course and enrollment & subjects '),

        ('UPDATE_COURSE_SUBJECT_VIEW_INDEX','Update Course Subject View Index'),
        ('CREATE_COURSE_SUBJECT','Create Course Subject'),
        ('DELETE_COURSE_SUBJECT','Delete Course Subject'),
        
        ('READ_COURSE_CATEGORY','View Course Category'),
        ('CREATE_COURSE_CATEGORY','Create Course Category'),
        ('DELETE_COURSE_CATEGORY','Delete Course Category'),
        ('UPDATE_COURSE_CATEGORY','Update Course Category'),
        ('UPDATE_COURSE_CATEGORY_VIEW_INDEX','Update Course Category View Index'),
        ('READ_COURSE_BY_CATEGORY','View Course By Category'),
        
        ('READ_COUPON_CODE','View Coupon Code'),
        ('DELETE_COUPON_CODE','Delete Coupon Code'),
        ('UPDATE_COUPON_CODE','Update Coupon Code'),
        ('CREATE_COUPON_CODE','Create Coupon Code'),
        
        ('CREATE_COUPON_CODE_COURSES','Create Coupon Code Courses'),
        ('DELETE_COUPON_CODE_COURSES','Delete Coupon Code Courses'),
        ('UPDATE_COUPON_CODE_COURSES','Update Coupon Code Courses'),
        
        ('CREATE_CHAPTER_TYPES','Create Chapter Types'),
        ('UPDATE_CHAPTER_TYPES_VIEW_INDEXES','Update Chapter Types View Indexes'),
        ('UPDATE_CHAPTER_TYPES','Update Chapter Types'),
        ('DELETE_CHAPTER_TYPES','Delete Chapter Types'),

        ('CREATE_AUTHORITIES','Create Authorities'),
        ('DELETE_AUTHORITIES','Delete Authorities and Role Authority'),

        ('CREATE_POLICY', 'Create Policy'),
        ('UPDATE_POLICY', 'Update Policy'),
        ('DELETE_POLICY', 'Delete Policy'),
        ('UPDATE_POLICY_VIEW_INDEX', 'Update Policy View Index'),

        ('CREATE_STREAM_SELECTION_TEST_QUESTION', 'Create Stream Selection Test Question'),
        ('UPDATE_STREAM_SELECTION_TEST_QUESTION', 'Update Stream Selection Test Question'),
        ('DELETE_STREAM_SELECTION_TEST_QUESTION', 'Delete Stream Selection Test Question'),

        ('CREATE_STREAM_SELECTION_QUESTION_CATEGORY', 'Create Stream Selection Question Category'),
        ('UPDATE_STREAM_SELECTION_QUESTION_CATEGORY', 'Update Stream Selection Question Category'),
        ('DELETE_STREAM_SELECTION_QUESTION_CATEGORY', 'Delete Stream Selection Question Category'),

        ('CREATE_STREAM_SELECTION_TEST_INVITE', 'Create Stream Selection Test Invite'),
        ('UPDATE_STREAM_SELECTION_TEST_INVITE', 'Update Stream Selection Test Invite'),
        ('DELETE_STREAM_SELECTION_TEST_INVITE', 'Delete Stream Selection Test Invite'),

        ('WRITE_USER_BASICS', 'Write User Basic Profile'),
        ('READ_USER_BASICS', 'Read User Basic Profile'),
        ('UPDATE_USER_ENROLLMENTS', 'Update User Enrollments'),
        ('USE_PAGE_INQUIRIES', 'Page For Managing Inquiries'),
        ('UPDATE_COURSE_SUBJECT', 'Update Course Subject'),
        ('ASSIGN_COURSE_SUBJECT', 'Assign Course Subject'),
        ('READ_MEDIA_UPDATE', 'Read Media For Update'),
        ('UPDATE_MEDIA_VIEW_INDEX', 'Update Media View Index'),
        ('MANAGE_USER_STREAMING_DEVICES', 'Manage User Streaming Devices'),

        ('CREATE_USER_NOTE', 'Create User Note'),
        ('READ_USER_NOTE', 'Read User Note'),
        ('UPDATE_USER_NOTE', 'Update User Note'),
        ('DELETE_USER_NOTE', 'Delete User Note'),

        ('CREATE_NOTIFICATION', 'Create Notification'),
        ('READ_NOTIFICATION', 'Read Notification'),
        ('USE_PAGE_MANAGE_NOTIFICATIONS', 'Page For Managing Notifications')`,

        `INSERT IGNORE INTO ROLES (title) VALUES ('STUDENT')`,
        `INSERT IGNORE INTO ROLES (title) VALUES ('DEVELOPER')`,

        `INSERT IGNORE INTO ROLE_AUTHORITIES (role_id, authority_id) SELECT 2, id FROM AUTHORITIES`,
        `INSERT IGNORE INTO ROLE_AUTHORITIES (role_id, authority_id)
         SELECT 1, id FROM AUTHORITIES WHERE title = 'READ_NOTIFICATION'`,
        // Roles that can manage events also get notifications admin + create
        `INSERT IGNORE INTO ROLE_AUTHORITIES (role_id, authority_id)
         SELECT DISTINCT ra.role_id, a.id
         FROM ROLE_AUTHORITIES ra
         INNER JOIN AUTHORITIES event_auth ON event_auth.id = ra.authority_id AND event_auth.title = 'USE_PAGE_MANAGE_EVENTS'
         CROSS JOIN AUTHORITIES a
         WHERE a.title IN ('USE_PAGE_MANAGE_NOTIFICATIONS', 'CREATE_NOTIFICATION')`,

        `INSERT IGNORE INTO USERS (full_name, email ) VALUES ('Nisarg', 'hammerbyte.nisarg@gmail.com');`,
        `INSERT IGNORE INTO USER_ROLES (user_id, role_id) VALUES (1, 2);`,
        `INSERT IGNORE INTO USER_ROLES (user_id, role_id) VALUES (3, 2);`,
        `INSERT IGNORE INTO USER_ROLES (user_id, role_id) VALUES (5, 2);`,
    ];

    await Promise.all(createUserTableQuery.map((query) => executeSQLQueryRaw(query)));

    // CREATE TABLE IF NOT EXISTS does not add columns to existing tables.
    const ensureColumns = [
        `ALTER TABLE EXAM_CANDIDATURE ADD COLUMN interruptions INT NOT NULL DEFAULT 0`,
        `ALTER TABLE USERS ADD COLUMN guardian_email VARCHAR(48) NULL`,
        `ALTER TABLE USERS ADD COLUMN dob DATE NULL`,
        `ALTER TABLE USERS MODIFY email VARCHAR(48) NULL`,
        `ALTER TABLE BATCH_SCHEDULE ADD COLUMN subject VARCHAR(128) NULL`,
        `ALTER TABLE BATCH_SCHEDULE ADD COLUMN event_handler INT NULL`,
        `ALTER TABLE BATCH_SCHEDULE ADD INDEX idx_batch_schedule_handler (event_handler)`,
    ];

    await Promise.all(
        ensureColumns.map((query) =>
            executeSQLQueryRaw(query).catch((error) => {
                if (
                    error?.code !== "ER_DUP_FIELDNAME" &&
                    error?.code !== "ER_DUP_KEYNAME" &&
                    error?.errno !== 1060 &&
                    error?.errno !== 1061
                ) {
                    logger.error(`ensureColumns failed: ${query} - ${error}`);
                }
            }),
        ),
    );
}

// Utility function to execute SQL queries using promises
function executeSQLQueryRaw(query) {
    return new Promise((resolve, reject) => {
        dbConnectionPool.getConnection((error, dbConnection) => {
            if (error) {
                logger.error(`Database Connection Failed ${error.message}`);
            } else {
                dbConnection.query(query, (error, result) => {
                    logger.info(`Executing ${query}`);
                    if (error) {
                        logger.error(`FAILED - ${query}, error: ${error}`);
                        reject(error); // Reject the promise if the query fails
                    } else {
                        resolve(result); // Resolve the promise if the query succeeds
                    }
                    dbConnection.release();
                });
            }
        });
    });
}

function executeSQLQueryParameterized(query, parameters) {
    const values = (parameters || []).map((value) => (value === undefined ? null : value));
    return new Promise((resolve, reject) => {
        dbConnectionPool.getConnection((error, dbConnection) => {
            if (error) {
                logger.error(`Database Connection Failed ${error.message}`);
                reject(error);
                return;
            }
            try {
                dbConnection.execute(query, values, (error, result) => {
                    logger.info(`Executing ${query} [${values}]`);
                    if (error) {
                        logger.error("FAILED - ", query, error);
                        reject(error);
                    } else {
                        resolve(result);
                    }
                    dbConnection.release();
                });
            } catch (executeError) {
                dbConnection.release();
                reject(executeError);
            }
        });
    });
}

// Export the pool to use in other files
module.exports = { generateDBTables, executeSQLQueryRaw, executeSQLQueryParameterized };



