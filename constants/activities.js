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
};

module.exports = { ACTIVITIES };
