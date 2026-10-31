const { hasRequiredAuthority } = require("../utils");

module.exports = (requiredAuthority) => (req, res, next) => {
    if (!req?.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    if (hasRequiredAuthority(req?.user?.authorities, requiredAuthority)) {
        return next();
    }
    return res.status(403).json({ error: `You Don't have authority ${requiredAuthority} to perform this operation` });
};
