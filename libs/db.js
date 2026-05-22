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
            email VARCHAR(48) NOT NULL UNIQUE,
            phone VARCHAR(13) NULL UNIQUE,
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
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
        `
        CREATE TABLE IF NOT EXISTS COURSE_DIALOG(
            id INT AUTO_INCREMENT PRIMARY KEY,
            course_id INT NOT NULL,
            title VARCHAR(96) NOT NULL,
            heading VARCHAR(96) NOT NULL,
            description VARCHAR(256) NOT NULL,
            active BOOLEAN NOT NULL DEFAULT TRUE,
            media_url VARCHAR(128) NULL UNIQUE,
            note VARCHAR(128) NOT NULL,
            redirect_url VARCHAR(256) DEFAULT NULL
        )
        `,
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
        `CREATE TABLE IF NOT EXISTS POLICIES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL UNIQUE,
            description VARCHAR(1024) NOT NULL UNIQUE,
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
            start_at DATETIME NOT NULL,
            end_at DATETIME NOT NULL,
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
            marks TINYINT NOT NULL DEFAULT 0,
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

        `INSERT IGNORE INTO BRANCHES (id, title, address, description, active, created_on, updated_at) VALUES
        (1, 'Head Office', '123 Main Street, Mumbai', 'Main corporate branch', 1, '2025-08-10 23:05:32', '2025-08-10 23:05:32'),
        (2, 'Ahmedabad Branch', '45 Riverfront Road, Ahmedabad', 'Serves Gujarat region', 1, '2025-08-10 23:05:32', '2025-08-10 23:05:32'),
        (3, 'Bangalore Branch', '88 MG Road, Bangalore', 'South India operations', 1, '2025-08-10 23:05:32', '2025-08-10 23:05:32')`,

        `INSERT IGNORE INTO AUTHORITIES (title, description) VALUES
        ('MANAGE_OTHER_USERS', 'Manage Other User Profile'),
        ('MANAGE_COURSES', 'Manage Course Content'),

        ('MANAGE_USER_INQUIRIES', 'Manage User Inquiries'),
        ('MANAGE_FEATURE_CAROUSEL', 'Manage Carousel Items'),
        ('USE_EMPLOYEE_CORNER', 'Employee Corner Visibility'),
        ('USE_PAGE_MY_EXPENSES', 'Page For Expense Submission'),
        ('USE_PAGE_MANAGE_EXAMS', 'Page For Exam Paper'),
        ('USE_ADMIN_CORNER', 'Admin Corner Visibility'),
        ('USE_PAGE_MANAGE_BRANCHES', 'Page For Managing Branches'),
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

        ('CREATE_USER_NOTE', 'Create User Note'),
        ('READ_USER_NOTE', 'Read User Note'),
        ('UPDATE_USER_NOTE', 'Update User Note'),
        ('DELETE_USER_NOTE', 'Delete User Note')`,

        `INSERT IGNORE INTO ROLES (title) VALUES ('STUDENT')`,
        `INSERT IGNORE INTO ROLES (title) VALUES ('DEVELOPER')`,

        `INSERT IGNORE INTO ROLE_AUTHORITIES (role_id, authority_id) SELECT 2, id FROM AUTHORITIES`,

        `INSERT IGNORE INTO USERS (full_name, email ) VALUES ('Nisarg', 'hammerbyte.nisarg@gmail.com');`,
        `INSERT IGNORE INTO USER_ROLES (user_id, role_id) VALUES (1, 2);`,
        `INSERT IGNORE INTO USER_ROLES (user_id, role_id) VALUES (3, 2);`,
        `INSERT IGNORE INTO USER_ROLES (user_id, role_id) VALUES (5, 2);`,

    ];

    const examSeedQueries = [
        `INSERT INTO EXAM_SERIES (title, course_id, fees, start_at, end_at, active) VALUES
            ('Exam Series - Finished 2026', 9, 0, '2026-01-15 09:00:00', '2026-03-31 18:00:00', TRUE),
            ('Exam Series - Ongoing 2026', 7, 0, '2026-05-01 09:00:00', '2026-06-30 18:00:00', TRUE),
            ('Exam Series - Upcoming 2026', 8, 0, '2026-07-01 09:00:00', '2026-07-31 18:00:00', TRUE)`,

        `INSERT INTO EXAMS (exam_series_id, subject_id, start_at, end_at)
            SELECT es.id, cs.subject_id, '2026-02-10 10:00:00', '2026-02-10 11:30:00'
            FROM EXAM_SERIES es
            INNER JOIN COURSE_SUBJECTS cs ON cs.course_id = es.course_id
            WHERE es.title = 'Exam Series - Finished 2026'
            LIMIT 1`,
        `INSERT INTO EXAMS (exam_series_id, subject_id, start_at, end_at)
            SELECT es.id, cs.subject_id, '2026-05-01 09:00:00', '2026-05-10 18:00:00'
            FROM EXAM_SERIES es
            INNER JOIN COURSE_SUBJECTS cs ON cs.course_id = es.course_id
            WHERE es.title = 'Exam Series - Ongoing 2026'
            ORDER BY cs.subject_id
            LIMIT 1 OFFSET 0`,
        `INSERT INTO EXAMS (exam_series_id, subject_id, start_at, end_at)
            SELECT es.id, cs.subject_id, '2026-05-05 09:00:00', '2026-05-14 18:00:00'
            FROM EXAM_SERIES es
            INNER JOIN COURSE_SUBJECTS cs ON cs.course_id = es.course_id
            WHERE es.title = 'Exam Series - Ongoing 2026'
            ORDER BY cs.subject_id
            LIMIT 1 OFFSET 1`,
        `INSERT INTO EXAMS (exam_series_id, subject_id, start_at, end_at)
            SELECT es.id, cs.subject_id, '2026-05-18 09:00:00', '2026-05-25 18:00:00'
            FROM EXAM_SERIES es
            INNER JOIN COURSE_SUBJECTS cs ON cs.course_id = es.course_id
            WHERE es.title = 'Exam Series - Ongoing 2026'
            ORDER BY cs.subject_id
            LIMIT 1 OFFSET 2`,
        `INSERT INTO EXAMS (exam_series_id, subject_id, start_at, end_at)
            SELECT es.id, cs.subject_id, '2026-06-20 09:00:00', '2026-06-28 18:00:00'
            FROM EXAM_SERIES es
            INNER JOIN COURSE_SUBJECTS cs ON cs.course_id = es.course_id
            WHERE es.title = 'Exam Series - Ongoing 2026'
            ORDER BY cs.subject_id
            LIMIT 1 OFFSET 3`,
        `INSERT INTO EXAMS (exam_series_id, subject_id, start_at, end_at)
            SELECT es.id, cs.subject_id, '2026-07-05 09:00:00', '2026-07-05 11:00:00'
            FROM EXAM_SERIES es
            INNER JOIN COURSE_SUBJECTS cs ON cs.course_id = es.course_id
            WHERE es.title = 'Exam Series - Upcoming 2026'
            LIMIT 1`,

        `INSERT INTO EXAM_QUESTIONS (exam_id, question, choice_one, choice_two, choice_three, choice_four, correct_choice, media_url)
            SELECT e.id, 'Finished exam sample question?', 'A', 'B', 'C', 'D', 'A', NULL
            FROM EXAMS e
            INNER JOIN EXAM_SERIES es ON es.id = e.exam_series_id
            WHERE es.title = 'Exam Series - Finished 2026'`,
        `INSERT INTO EXAM_QUESTIONS (exam_id, question, choice_one, choice_two, choice_three, choice_four, correct_choice, media_url)
            SELECT e.id, CONCAT('Ongoing exam sample question (subject ', e.subject_id, ')?'), 'A', 'B', 'C', 'D', 'C', NULL
            FROM EXAMS e
            INNER JOIN EXAM_SERIES es ON es.id = e.exam_series_id
            WHERE es.title = 'Exam Series - Ongoing 2026'`,
        `INSERT INTO EXAM_QUESTIONS (exam_id, question, choice_one, choice_two, choice_three, choice_four, correct_choice, media_url)
            SELECT e.id, 'Upcoming exam sample question?', 'A', 'B', 'C', 'D', 'B', NULL
            FROM EXAMS e
            INNER JOIN EXAM_SERIES es ON es.id = e.exam_series_id
            WHERE es.title = 'Exam Series - Upcoming 2026'`,
    ];

    await Promise.all(createUserTableQuery.map((query) => executeSQLQueryRaw(query)));

    for (const query of examSeedQueries) {
        await executeSQLQueryRaw(query);
    }
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
    return new Promise((resolve, reject) => {
        dbConnectionPool.getConnection((error, dbConnection) => {
            if (error) {
                logger.error(`Database Connection Failed ${error.message}`);
            } else {
                dbConnection.execute(query, parameters, (error, result) => {
                    logger.info(`Executing ${query} [${parameters}]`);
                    if (error) {
                        logger.error("FAILED - ", query, error);
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

// Export the pool to use in other files
module.exports = { generateDBTables, executeSQLQueryRaw, executeSQLQueryParameterized };



