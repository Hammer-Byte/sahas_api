const { KEY_GUEST_TOKEN } = require("../constants");
const { getUserByAuthenticationToken, getAuthoritiesByRoleIds } = require("../db/users");

module.exports = async (req, res, next) => {
    //verify token and get user information

    if (req.headers?.[KEY_GUEST_TOKEN] && (user = await getUserByAuthenticationToken(req.headers?.[KEY_GUEST_TOKEN]))) {
        req.user = user;

     
    }
    next();
};
