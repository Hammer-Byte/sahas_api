const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
const { addWalletTransaction, getWalletTransactionById } = require("../db/wallet_transactions");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");
const { createNotification, getAlertTypeId } = require("../libs/notifications");

const router = libExpress.Router();

//tested
router.post("/", requires_authority(AUTHORITIES.CREATE_WALLET_TRANSACTION), async (req, res) => {
    const requiredBodyFields = ["user_id", "amount", "note"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        const walletTransactionId = await addWalletTransaction({ created_by: req.user.id, ...validatedRequestBody });
        const amount = Number(validatedRequestBody.amount);
        const isCredit = amount >= 0;
        await createNotification({
            user_id: validatedRequestBody.user_id,
            title: isCredit ? "Wallet credited" : "Wallet debited",
            description: `Your wallet was ${isCredit ? "credited" : "debited"} by ${Math.abs(amount)}.${validatedRequestBody.note ? ` Note: ${validatedRequestBody.note}` : ""}`,
            type_id: isCredit ? undefined : await getAlertTypeId(),
            created_by: req.user.id,
        });
        res.status(201).json(await getWalletTransactionById({ id: walletTransactionId }));
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

module.exports = router;
