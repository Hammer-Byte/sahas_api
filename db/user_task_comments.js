const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

const COMMENT_SELECT = `SELECT USER_TASK_COMMENTS.*, USERS.full_name AS created_by_full_name
     FROM USER_TASK_COMMENTS
     LEFT JOIN USERS ON USER_TASK_COMMENTS.created_by = USERS.id`;

function getUserTaskCommentsByTaskId({ task_id }) {
    return executeSQLQueryParameterized(`${COMMENT_SELECT} WHERE task_id = ? ORDER BY USER_TASK_COMMENTS.id ASC`, [task_id]).catch((error) => {
        logger.error(`getUserTaskCommentsByTaskId: ${error}`);
        return [];
    });
}

function getUserTaskCommentById({ id }) {
    return executeSQLQueryParameterized(`${COMMENT_SELECT} WHERE USER_TASK_COMMENTS.id = ?`, [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getUserTaskCommentById: ${error}`);
            return false;
        });
}

function addUserTaskComment({ task_id, comment, attachment = null, created_by }) {
    return executeSQLQueryParameterized("INSERT INTO USER_TASK_COMMENTS(task_id, comment, attachment, created_by) VALUES(?,?,?,?)", [
        task_id,
        comment,
        attachment,
        created_by,
    ])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addUserTaskComment: ${error}`);
            throw error;
        });
}

function updateUserTaskCommentById({ id, comment, attachment = null }) {
    return executeSQLQueryParameterized("UPDATE USER_TASK_COMMENTS SET comment=?, attachment=? WHERE id=?", [comment, attachment, id]).catch((error) => {
        logger.error(`updateUserTaskCommentById: ${error}`);
        throw error;
    });
}

function deleteUserTaskCommentById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM USER_TASK_COMMENTS WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteUserTaskCommentById: ${error}`);
        throw error;
    });
}

function deleteUserTaskCommentsByTaskId({ task_id }) {
    return executeSQLQueryParameterized("DELETE FROM USER_TASK_COMMENTS WHERE task_id=?", [task_id]).catch((error) => {
        logger.error(`deleteUserTaskCommentsByTaskId: ${error}`);
        throw error;
    });
}

module.exports = {
    getUserTaskCommentsByTaskId,
    getUserTaskCommentById,
    addUserTaskComment,
    updateUserTaskCommentById,
    deleteUserTaskCommentById,
    deleteUserTaskCommentsByTaskId,
};
