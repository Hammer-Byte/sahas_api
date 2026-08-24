const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllSelfTestDialogContents() {
    return executeSQLQueryParameterized(
        `SELECT * FROM SELF_TEST_DIALOG_CONTENTS ORDER BY view_index ASC, id ASC`,
    ).catch((error) => {
        logger.error(`getAllSelfTestDialogContents: ${error}`);
        return [];
    });
}

function getSelfTestDialogContentById({ id }) {
    return executeSQLQueryParameterized(`SELECT * FROM SELF_TEST_DIALOG_CONTENTS WHERE id=?`, [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getSelfTestDialogContentById: ${error}`);
            return false;
        });
}

function getEligibleSelfTestDialogContents({ user_id }) {
    return executeSQLQueryParameterized(
        `SELECT c.*
        FROM SELF_TEST_DIALOG_CONTENTS c
        WHERE c.active = TRUE
          AND CURDATE() BETWEEN c.start_date AND c.end_date
          AND (
            SELECT COUNT(*)
            FROM SELF_TEST_DIALOG_CONTENT_VIEWS v
            WHERE v.user_id = ?
              AND v.content_id = c.id
              AND (c.daily = FALSE OR DATE(v.created_at) = CURDATE())
          ) < c.frequency
        ORDER BY c.view_index ASC, c.id ASC`,
        [user_id],
    ).catch((error) => {
        logger.error(`getEligibleSelfTestDialogContents: ${error}`);
        return [];
    });
}

function addSelfTestDialogContent({
    content,
    redirect_url = null,
    start_date,
    end_date,
    daily = false,
    frequency,
    active = true,
    view_index = 0,
    interval = 0,
}) {
    return executeSQLQueryParameterized(
        `INSERT INTO SELF_TEST_DIALOG_CONTENTS (content, redirect_url, start_date, end_date, daily, frequency, active, view_index, \`interval\`)
        VALUES (?,?,?,?,?,?,?,?,?)`,
        [content, redirect_url, start_date, end_date, daily, frequency, active, view_index, interval],
    )
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addSelfTestDialogContent: ${error}`));
}

function updateSelfTestDialogContentById({
    id,
    content,
    redirect_url = null,
    start_date,
    end_date,
    daily,
    frequency,
    active,
    view_index,
    interval = 0,
}) {
    return executeSQLQueryParameterized(
        `UPDATE SELF_TEST_DIALOG_CONTENTS
        SET content=?, redirect_url=?, start_date=?, end_date=?, daily=?, frequency=?, active=?, view_index=?, \`interval\`=?
        WHERE id=?`,
        [content, redirect_url, start_date, end_date, daily, frequency, active, view_index, interval, id],
    ).catch((error) => logger.error(`updateSelfTestDialogContentById: ${error}`));
}

function deleteSelfTestDialogContentViewsByContentId({ content_id }) {
    return executeSQLQueryParameterized(`DELETE FROM SELF_TEST_DIALOG_CONTENT_VIEWS WHERE content_id=?`, [content_id]).catch((error) =>
        logger.error(`deleteSelfTestDialogContentViewsByContentId: ${error}`),
    );
}

function deleteSelfTestDialogContentById({ id }) {
    return deleteSelfTestDialogContentViewsByContentId({ content_id: id })
        .then(() => executeSQLQueryParameterized(`DELETE FROM SELF_TEST_DIALOG_CONTENTS WHERE id=?`, [id]))
        .catch((error) => logger.error(`deleteSelfTestDialogContentById: ${error}`));
}

function addSelfTestDialogContentView({ user_id, content_id }) {
    return executeSQLQueryParameterized(`INSERT INTO SELF_TEST_DIALOG_CONTENT_VIEWS (user_id, content_id) VALUES (?,?)`, [user_id, content_id])
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addSelfTestDialogContentView: ${error}`));
}

function updateSelfTestDialogContentViewIndexById({ id, view_index }) {
    return executeSQLQueryParameterized(`UPDATE SELF_TEST_DIALOG_CONTENTS SET view_index=? WHERE id=?`, [view_index, id]).catch((error) =>
        logger.error(`updateSelfTestDialogContentViewIndexById: ${error}`),
    );
}

module.exports = {
    getAllSelfTestDialogContents,
    getSelfTestDialogContentById,
    getEligibleSelfTestDialogContents,
    addSelfTestDialogContent,
    updateSelfTestDialogContentById,
    updateSelfTestDialogContentViewIndexById,
    deleteSelfTestDialogContentById,
    addSelfTestDialogContentView,
};
