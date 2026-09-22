const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

const TASK_SELECT = `SELECT USER_TASKS.*,
            ASSIGNEE.full_name AS user_full_name,
            CREATOR.full_name AS created_by_full_name,
            USER_TASK_STATUSES.title AS status_title
     FROM USER_TASKS
     LEFT JOIN USERS AS ASSIGNEE ON USER_TASKS.user_id = ASSIGNEE.id
     LEFT JOIN USERS AS CREATOR ON USER_TASKS.created_by = CREATOR.id
     LEFT JOIN USER_TASK_STATUSES ON USER_TASKS.status_id = USER_TASK_STATUSES.id`;

function getAllUserTaskStatuses() {
    return executeSQLQueryParameterized("SELECT id, title FROM USER_TASK_STATUSES ORDER BY id ASC").catch((error) => {
        logger.error(`getAllUserTaskStatuses: ${error}`);
        return [];
    });
}

function buildTaskFilters({
    scope,
    viewer_id,
    status_id = null,
    user_id = null,
    start_date = null,
    end_date = null,
    deadline_start = null,
    deadline_end = null,
    search = null,
}) {
    const where = [];
    const params = [];

    if (scope === "assigned") {
        where.push("USER_TASKS.user_id = ?");
        params.push(viewer_id);
    } else if (scope === "created") {
        where.push("USER_TASKS.created_by = ?");
        params.push(viewer_id);
    } else if (scope !== "all") {
        where.push("1 = 0");
    }

    if (status_id) {
        where.push("USER_TASKS.status_id = ?");
        params.push(status_id);
    }

    if (user_id && (scope === "created" || scope === "all")) {
        where.push("USER_TASKS.user_id = ?");
        params.push(user_id);
    }

    if (start_date) {
        where.push("DATE(USER_TASKS.created_on) >= DATE(?)");
        params.push(start_date);
    }

    if (end_date) {
        where.push("DATE(USER_TASKS.created_on) <= DATE(?)");
        params.push(end_date);
    }

    if (deadline_start) {
        where.push("USER_TASKS.deadline IS NOT NULL AND DATE(USER_TASKS.deadline) >= DATE(?)");
        params.push(deadline_start);
    }

    if (deadline_end) {
        where.push("USER_TASKS.deadline IS NOT NULL AND DATE(USER_TASKS.deadline) <= DATE(?)");
        params.push(deadline_end);
    }

    if (search) {
        where.push("(USER_TASKS.title LIKE ? OR USER_TASKS.description LIKE ?)");
        params.push(`%${search}%`, `%${search}%`);
    }

    return {
        whereClause: where.length ? `WHERE ${where.join(" AND ")}` : "",
        params,
    };
}

function normalizeSortOrder(sort_order) {
    return String(sort_order || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";
}

function getUserTasksByFilters({
    scope,
    viewer_id,
    status_id = null,
    user_id = null,
    start_date = null,
    end_date = null,
    deadline_start = null,
    deadline_end = null,
    search = null,
    sort_order = "DESC",
    offSet = 0,
    limit = 20,
}) {
    const { whereClause, params } = buildTaskFilters({
        scope,
        viewer_id,
        status_id,
        user_id,
        start_date,
        end_date,
        deadline_start,
        deadline_end,
        search,
    });
    const order = normalizeSortOrder(sort_order);

    return executeSQLQueryParameterized(
        `${TASK_SELECT} ${whereClause} ORDER BY USER_TASKS.created_on ${order} LIMIT ? OFFSET ?`,
        [...params, Number(limit), Number(offSet)]
    ).catch((error) => {
        logger.error(`getUserTasksByFilters: ${error}`);
        return [];
    });
}

function getUserTasksCountByFilters({
    scope,
    viewer_id,
    status_id = null,
    user_id = null,
    start_date = null,
    end_date = null,
    deadline_start = null,
    deadline_end = null,
    search = null,
}) {
    const { whereClause, params } = buildTaskFilters({
        scope,
        viewer_id,
        status_id,
        user_id,
        start_date,
        end_date,
        deadline_start,
        deadline_end,
        search,
    });

    return executeSQLQueryParameterized(`SELECT COUNT(*) AS count FROM USER_TASKS ${whereClause}`, params)
        .then((result) => result[0].count)
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

function addUserTask({ title, description = null, user_id, status_id, attachment = null, deadline = null, created_by }) {
    return executeSQLQueryParameterized(
        "INSERT INTO USER_TASKS(title, description, user_id, status_id, attachment, deadline, created_by) VALUES(?,?,?,?,?,?,?)",
        [title, description, user_id, status_id, attachment, deadline, created_by]
    )
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addUserTask: ${error}`);
            throw error;
        });
}

function updateUserTaskById({ id, title, description = null, user_id, status_id, attachment = null, deadline = null }) {
    return executeSQLQueryParameterized(
        "UPDATE USER_TASKS SET title=?, description=?, user_id=?, status_id=?, attachment=?, deadline=? WHERE id=?",
        [title, description, user_id, status_id, attachment, deadline, id]
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

function deleteUserTaskById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM USER_TASKS WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteUserTaskById: ${error}`);
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
    deleteUserTaskById,
};
