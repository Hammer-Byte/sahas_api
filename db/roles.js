const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

//freeze
function getAllRoles() {
    return executeSQLQueryParameterized("SELECT * FROM ROLES").catch((error) => {
        logger.error(`getAllRoles: ${error}`);
        return false;
    });
}

//freeze
function deleteRoleById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM ROLES WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteRoleById: ${error}`);
    });
}

//freeze
function addRole({ title }) {
    return executeSQLQueryParameterized("INSERT INTO ROLES(title) VALUES(?)", [title])
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addRole: ${error}`));
}

//freeze
function getRoleById({ id }) {
    return executeSQLQueryParameterized("SELECT * FROM ROLES WHERE id=?", [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => logger.error(`getRoleById: ${error}`));
}

//freeze
function updateRoleById({ id, title, active, task_assignable = false }) {
    return executeSQLQueryParameterized("UPDATE ROLES SET title=?,active=?,task_assignable=? WHERE id=?", [
        title,
        active,
        Boolean(task_assignable),
        id,
    ]).catch((error) => logger.error(`updateRoleById: ${error}`));
}

module.exports = { getAllRoles, deleteRoleById, addRole, getRoleById, updateRoleById };
