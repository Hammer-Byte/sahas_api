const libExpress = require("express");
const { getSahasWebsite } = require("../db/sahaswebsite");

const router = libExpress.Router();

router.get("/", async (req, res) => {
    const data = await getSahasWebsite();
    if (!data) {
        return res.status(400).json({ error: "Website Not Exist" });
    }
    return res.status(200).json(data);
});

module.exports = router;
