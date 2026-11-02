const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getChoghadiyaSlotsByDate({ date }) {
    return executeSQLQueryParameterized(
        `SELECT date, period, slot, name, start_at, end_at
         FROM CHOGHADIYA_SLOTS
         WHERE date = ?
         ORDER BY period ASC, slot ASC`,
        [date],
    ).catch((error) => {
        logger.error(`getChoghadiyaSlotsByDate: ${error}`);
        return [];
    });
}

function deleteChoghadiyaSlotsExceptYear({ year }) {
    return executeSQLQueryParameterized(`DELETE FROM CHOGHADIYA_SLOTS WHERE YEAR(date) <> ?`, [year])
        .then((result) => result.affectedRows || 0)
        .catch((error) => {
            logger.error(`deleteChoghadiyaSlotsExceptYear: ${error}`);
            return 0;
        });
}

function countChoghadiyaDaysByYear({ year }) {
    return executeSQLQueryParameterized(`SELECT COUNT(DISTINCT date) AS days_count FROM CHOGHADIYA_SLOTS WHERE YEAR(date) = ?`, [year]).then(
        (rows) => Number(rows?.[0]?.days_count) || 0,
    );
}

async function replaceChoghadiyaSlotsForDate({ date, slots }) {
    if (!Array.isArray(slots) || !slots.length) {
        return false;
    }

    await executeSQLQueryParameterized(`DELETE FROM CHOGHADIYA_SLOTS WHERE date = ?`, [date]).catch(() => null);

    const values = [];
    const placeholders = slots
        .map((slot) => {
            values.push(date, slot.period, slot.slot, slot.name, slot.start_at, slot.end_at);
            return "(?, ?, ?, ?, ?, ?)";
        })
        .join(", ");

    return executeSQLQueryParameterized(
        `INSERT INTO CHOGHADIYA_SLOTS (date, period, slot, name, start_at, end_at) VALUES ${placeholders}`,
        values,
    )
        .then((result) => result.affectedRows > 0)
        .catch((error) => {
            logger.error(`replaceChoghadiyaSlotsForDate: ${error}`);
            return false;
        });
}

module.exports = {
    getChoghadiyaSlotsByDate,
    deleteChoghadiyaSlotsExceptYear,
    countChoghadiyaDaysByYear,
    replaceChoghadiyaSlotsForDate,
};
