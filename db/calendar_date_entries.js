const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getCalendarDateEntriesInRange({ from, to, is_holiday = null }) {
    const params = [from, to];
    let holidayClause = "";
    if (is_holiday === true || is_holiday === false) {
        holidayClause = " AND is_holiday = ?";
        params.push(is_holiday ? 1 : 0);
    }

    return executeSQLQueryParameterized(
        `SELECT id, date, title, description, is_holiday, created_by, created_on
         FROM CALENDAR_DATE_ENTRIES
         WHERE date >= ? AND date <= ?${holidayClause}
         ORDER BY date ASC, is_holiday DESC, id ASC`,
        params,
    ).catch((error) => {
        logger.error(`getCalendarDateEntriesInRange: ${error}`);
        return [];
    });
}

function getCalendarDateEntryById({ id }) {
    return executeSQLQueryParameterized(
        `SELECT id, date, title, description, is_holiday, created_by, created_on
         FROM CALENDAR_DATE_ENTRIES WHERE id = ?`,
        [id],
    )
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getCalendarDateEntryById: ${error}`);
            return false;
        });
}

function addCalendarDateEntry({ date, title, description = null, is_holiday = false, created_by = null }) {
    return executeSQLQueryParameterized(
        `INSERT INTO CALENDAR_DATE_ENTRIES (date, title, description, is_holiday, created_by) VALUES (?, ?, ?, ?, ?)`,
        [date, title, description, is_holiday ? 1 : 0, created_by],
    )
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addCalendarDateEntry: ${error}`);
            return false;
        });
}

function updateCalendarDateEntryById({ id, date, title, description = null, is_holiday = false }) {
    return executeSQLQueryParameterized(
        `UPDATE CALENDAR_DATE_ENTRIES SET date = ?, title = ?, description = ?, is_holiday = ? WHERE id = ?`,
        [date, title, description, is_holiday ? 1 : 0, id],
    )
        .then((result) => result.affectedRows > 0)
        .catch((error) => {
            logger.error(`updateCalendarDateEntryById: ${error}`);
            return false;
        });
}

function deleteCalendarDateEntryById({ id }) {
    return executeSQLQueryParameterized(`DELETE FROM CALENDAR_DATE_ENTRIES WHERE id = ?`, [id])
        .then((result) => result.affectedRows > 0)
        .catch((error) => {
            logger.error(`deleteCalendarDateEntryById: ${error}`);
            return false;
        });
}

module.exports = {
    getCalendarDateEntriesInRange,
    getCalendarDateEntryById,
    addCalendarDateEntry,
    updateCalendarDateEntryById,
    deleteCalendarDateEntryById,
};
