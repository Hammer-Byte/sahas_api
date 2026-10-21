function text(value) {
    const rendered = value == null ? "" : String(value).trim();
    return rendered || "unknown";
}

const ACTIVITIES = {
    LOGIN: () => "Signed in",
    READ_COURSE: ({ course } = {}) => `Opened course ${text(course)}`,
    READ_CHAPTER: ({ chapter } = {}) => `Opened chapter ${text(chapter)}`,
    VIEW_MEDIA: ({ chapter } = {}) => `Viewed media in ${text(chapter)}`,
    UPDATE_PROFILE: () => "Updated profile",
    PAY_FEES: ({ amount, course } = {}) => `Paid ${text(amount)} for ${text(course)}`,
    START_EXAM: ({ exam } = {}) => `Started exam ${text(exam)}`,
    SUBMIT_EXAM: ({ exam } = {}) => `Submitted exam ${text(exam)}`,
    TAKE_CHAPTER_TEST: ({ subject } = {}) => `Started chapter test for ${text(subject)}`,
    WALLET: ({ amount } = {}) => `Wallet updated by ${text(amount)}`,
    ADD_COURSE: ({ course } = {}) => `Added course ${text(course)}`,
    UPDATE_COURSE: ({ course } = {}) => `Updated course ${text(course)}`,
    DELETE_COURSE: ({ course } = {}) => `Deleted course ${text(course)}`,
    ADD_CHAPTER: ({ chapter } = {}) => `Added chapter ${text(chapter)}`,
    UPDATE_CHAPTER: ({ chapter } = {}) => `Updated chapter ${text(chapter)}`,
    DELETE_CHAPTER: ({ chapter } = {}) => `Deleted chapter ${text(chapter)}`,
    ADD_SUBJECT: ({ subject } = {}) => `Added subject ${text(subject)}`,
    UPDATE_SUBJECT: ({ subject } = {}) => `Updated subject ${text(subject)}`,
    ADD_EXAM_SERIES: ({ series } = {}) => `Added exam series ${text(series)}`,
    UPDATE_EXAM_SERIES: ({ series } = {}) => `Updated exam series ${text(series)}`,
    ADD_EXAM: ({ exam } = {}) => `Added exam ${text(exam)}`,
    UPDATE_EXAM: ({ exam } = {}) => `Updated exam ${text(exam)}`,
    DELETE_EXAM: ({ exam } = {}) => `Deleted exam ${text(exam)}`,
    ENROLL_EXAM_SERIES: ({ series } = {}) => `Enrolled in exam series ${text(series)}`,
    CREATE_INQUIRY: ({ course } = {}) => `Created an inquiry for ${text(course)}`,
    UPDATE_INQUIRY: ({ course } = {}) => `Updated an inquiry for ${text(course)}`,
    ADD_INQUIRY_NOTE: () => "Added a note on an inquiry",
    CREATE_ENROLLMENT: ({ amount, course } = {}) => `Enrolled for ${text(amount)} in ${text(course)}`,
    UPDATE_ENROLLMENT: () => "Updated an enrollment",
    VERIFY_PAYMENT: ({ amount, course } = {}) => `Verified payment of ${text(amount)} for ${text(course)}`,
    UPDATE_NAME: ({ name } = {}) => `Updated name to ${text(name)}`,
    UPDATE_PHONE: ({ phone } = {}) => `Updated phone to ${text(phone)}`,
    UPDATE_EMAIL: ({ email } = {}) => `Updated email to ${text(email)}`,
    ADD_COUNSELING_NOTE: () => "Added a counseling note",
    ADD_GLOBAL_NOTE: () => "Added a note",
    ASSIGN_BATCH: ({ batch } = {}) => `Added to batch ${text(batch)}`,
    SEND_NOTIFICATION: ({ title } = {}) => `Sent notification ${text(title)}`,
};

module.exports = { ACTIVITIES };
