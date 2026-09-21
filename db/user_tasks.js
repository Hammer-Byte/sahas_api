const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllUserTaskStatuses() {
    return executeSQLQueryParameterized("SELECT id, title FROM USER_TASK_STATUSES ORDER BY id ASC").catch((error) => {
        logger.error(`getAllUserTaskStatuses: ${error}`);
        return [];
    });
}

const TASK_SELECT = `SELECT USER_TASKS.*,
            USER_TASK_STATUSES.title AS status_title,
            ASSIGNEE.full_name AS user_full_name,
            ASSIGNEE.email AS user_email,
            CREATOR.full_name AS created_by_full_name
     FROM USER_TASKS
     LEFT JOIN USER_TASK_STATUSES ON USER_TASKS.status_id = USER_TASK_STATUSES.id
     LEFT JOIN USERS ASSIGNEE ON USER_TASKS.user_id = ASSIGNEE.id
     LEFT JOIN USERS CREATOR ON USER_TASKS.created_by = CREATOR.id`;

function buildTaskFilters({ scope, viewer_id, status_id, user_id, start_date, end_date, search }) {
    const where = [];
    const params = [];

    if (scope === "assigned") {
        where.push("USER_TASKS.user_id = ?");
        params.push(viewer_id);
    } else if (scope === "created") {
        where.push("USER_TASKS.created_by = ?");
        params.push(viewer_id);
        if (user_id) {
            where.push("USER_TASKS.user_id = ?");
            params.push(user_id);
        }
    }

    if (status_id) {
        where.push("USER_TASKS.status_id = ?");
        params.push(status_id);
    }
    if (start_date) {
        where.push("DATE(USER_TASKS.created_on) >= ?");
        params.push(start_date);
    }
    if (end_date) {
        where.push("DATE(USER_TASKS.created_on) <= ?");
        params.push(end_date);
    }
    if (search) {
        where.push("(USER_TASKS.title LIKE ? OR USER_TASKS.description LIKE ?)");
        const like = `%${search}%`;
        params.push(like, like);
    }

    return { whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "", params };
}

function getUserTasksByFilters({ scope, viewer_id, status_id, user_id, start_date, end_date, search, offSet = 0, limit = 20 }) {
    const { whereSql, params } = buildTaskFilters({ scope, viewer_id, status_id, user_id, start_date, end_date, search });
    return executeSQLQueryParameterized(
        `${TASK_SELECT} ${whereSql} ORDER BY USER_TASKS.id DESC LIMIT ? OFFSET ?`,
        [...params, Number(limit), Number(offSet)],
    ).catch((error) => {
        logger.error(`getUserTasksByFilters: ${error}`);
        return [];
    });
}

function getUserTasksCountByFilters({ scope, viewer_id, status_id, user_id, start_date, end_date, search }) {
    const { whereSql, params } = buildTaskFilters({ scope, viewer_id, status_id, user_id, start_date, end_date, search });
    return executeSQLQueryParameterized(`SELECT COUNT(*) AS count FROM USER_TASKS ${whereSql}`, params)
        .then((result) => result?.[0]?.count || 0)
        .catch((error) => {
            logger.error(`getUserTasksCountByFilters: ${error}`);
            return 0;
        });
}

function getUserTaskById({ id }) {
    return executeSQLQueryParameterized(`${TASK_SELECT} WHERE USER_TASKS.id = ?`, [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getUserTaskById: ${error}`);
            return false;
        });
}

function addUserTask({ title, description = null, user_id, status_id, attachment = null, created_by }) {
    return executeSQLQueryParameterized(
        "INSERT INTO USER_TASKS(title, description, user_id, status_id, attachment, created_by) VALUES(?,?,?,?,?,?)",
        [title, description, user_id, status_id, attachment, created_by],
    )
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addUserTask: ${error}`);
            throw error;
        });
}

function updateUserTaskById({ id, title, description = null, user_id, status_id, attachment = null }) {
    return executeSQLQueryParameterized(
        "UPDATE USER_TASKS SET title=?, description=?, user_id=?, status_id=?, attachment=? WHERE id=?",
        [title, description, user_id, status_id, attachment, id],
    ).catch((error) => {
        logger.error(`updateUserTaskById: ${error}`);
        throw error;
    });
}

function updateUserTaskStatusById({ id, status_id }) {
    return executeSQLQueryParameterized("UPDATE USER_TASKS SET status_id=? WHERE id=?", [status_id, id]).catch((error) => {
        logger.error(`updateUserTaskStatusById: ${error}`);
        throw error;
    });
}

module.exports = {
    getAllUserTaskStatuses,
    getUserTasksByFilters,
    getUserTasksCountByFilters,
    getUserTaskById,
    addUserTask,
    updateUserTaskById,
    updateUserTaskStatusById,
};
