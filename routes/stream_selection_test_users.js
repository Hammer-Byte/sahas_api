const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
const { addUser, getUserById } = require("../db/users");
const { addUserHistory, getUserHistoryById } = require("../db/user_history");

const router = libExpress.Router();


// Get all stream selection test invites
router.post("/", async (req, res) => {
    const requiredBodyFields = ["full_name", "email", "phone", "address"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        if ((userId = await addUser(validatedRequestBody))) {
            await addUserHistory({ user_id: userId, ...validatedRequestBody?.history });

            const user = await getUserById({ id: userId });
            user.history = await getUserHistoryById({ user_id: user.id });

            return res.status(201).json(user);
        }
        return res.status(400).json({ error: "Unable To Add User - User Might Already Exist" });
    }

    return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
});



module.exports = router;
