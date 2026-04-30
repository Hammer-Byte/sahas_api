import { getUserByEmail } from "../db/users";

module.exports = async (req, res, next) => {
    if (!req?.user) {
        req.user = await getUserByEmail({ email: req.headers?.email });
    }

    next();
};