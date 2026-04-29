const libExpress = require("express");



const router = libExpress.Router();


// Get all stream selection test invites
router.get("/", async (req, res) => {
    const invites = await getAllStreamSelectionTestInvites();
    res.status(200).json(invites);
});



module.exports = router;
