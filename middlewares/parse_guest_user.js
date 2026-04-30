const { KEY_GUEST } = require("../constants");
const { getUserByEmail, getUserById } = require("../db/users");

module.exports = async (req, res, next) => {
    if (!req?.user) {
        req.user = await getUserById({ id: req.headers?.[KEY_GUEST] });
    }

    next();
};