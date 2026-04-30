import { getUserByEmail } from "../db/users";

export default async (req, res, next) => {
    req.user = await getUserByEmail({ email: req.headers?.email });
    next();
};