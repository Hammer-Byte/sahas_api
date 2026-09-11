const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllBranches() {
    return executeSQLQueryParameterized(`SELECT * FROM BRANCHES ORDER BY id`).catch((error) => {
        logger.error(`getAllBranches: ${error}`);
        return [];
    });
}

function getBranchById({ id }) {
    return executeSQLQueryParameterized(`SELECT * FROM BRANCHES WHERE id = ?`, [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getBranchById: ${error}`);
            return false;
        });
}

function addBranch({ title, address, description, active = true }) {
    return executeSQLQueryParameterized(`INSERT INTO BRANCHES (title, address, description, active) VALUES (?,?,?,?)`, [
        title,
        address,
        description,
        active !== false,
    ])
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addBranch: ${error}`));
}

function updateBranchById({ id, title, address, description, active = true }) {
    return executeSQLQueryParameterized(`UPDATE BRANCHES SET title=?, address=?, description=?, active=? WHERE id=?`, [
        title,
        address,
        description,
        !!active,
        id,
    ]).catch((error) => logger.error(`updateBranchById: ${error}`));
}

function deleteBranchById({ id }) {
    return executeSQLQueryParameterized(`DELETE FROM BRANCHES WHERE id=?`, [id]).catch((error) => {
        logger.error(`deleteBranchById: ${error}`);
        throw error;
    });
}

module.exports = { getAllBranches, getBranchById, addBranch, updateBranchById, deleteBranchById };
