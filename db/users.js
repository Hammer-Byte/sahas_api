const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");
const { getInquiriesByUserId } = require("./inquiries");
const { getFormattedDate } = require("../utils");

//tested
function getUserByEmail({ email }) {
    return executeSQLQueryParameterized(`SELECT * FROM USERS WHERE email=?`, [email])
        .then((user) => (user && user.length > 0 ? user[0] : false))
        .catch((error) => {
            logger.error(`getUserByEmail: ${error}`);
            return false;
        });
}

//tested
function addDefaultRoleToUser(userId) {
    return executeSQLQueryParameterized(`INSERT INTO USER_ROLES(user_id,role_id) VALUES(?,1)`, [userId]).catch((error) => {
        logger.error(`addDefaultRoleToUser: ${error}`);
        return false;
    });
}

//tested
function addUserByEmail({ email }) {
    return executeSQLQueryParameterized(`INSERT IGNORE INTO USERS(email) VALUES(?)`, [email])
        .then((result) => result?.affectedRows && addDefaultRoleToUser(result?.insertId))
        .catch((error) => {
            logger.error(`addUserByEmail: ${error}`);
            return false;
        });
}

function getUserByAuthenticationToken(token) {
    return (
        token &&
        executeSQLQueryParameterized(
            `SELECT USERS.* FROM AUTHENTICATION_TOKENS INNER JOIN USERS ON AUTHENTICATION_TOKENS.user_id=USERS.id  WHERE AUTHENTICATION_TOKENS.token=?`,
            [token],
        )
            .then((user) => (user && user.length > 0 ? user[0] : false))
            .catch((error) => {
                logger.error(`getUserByAuthenticationToken: ${error}`);
                return false;
            })
    );
}

function getGroupsById(id) {
    return executeSQLQueryParameterized("SELECT DISTINCT(title) FROM USER_GROUPS WHERE user_id=?", [id])
        .then((groups) => (groups && groups.length > 0 ? groups.map((row) => row.title) : []))
        .catch((error) => {
            logger.error(`getGroupsById: ${error}`);
            return false;
        });
}

//get user by transaction id
function getUserByTransactionId(transactionId) {
    return executeSQLQueryParameterized(`SELECT * FROM USERS INNER JOIN USER_TRANSACTIONS ON USERS.id=USER_TRANSACTIONS.user_id WHERE USER_TRANSACTIONS.id=?`, [
        transactionId,
    ])
        .then((results) => {
            return results.length > 0 ? results[0] : null;
        })
        .catch((error) => {
            logger.error(`getUserByTransactionId: ${error}`);
            return [];
        });
}

//freeze
function getUserById({ id }) {
    return executeSQLQueryParameterized(`SELECT * FROM USERS WHERE id = ?`, [id])
        .then((results) => (results.length > 0 ? results[0] : null))
        .catch((error) => logger.error(`getUserById: ${error}`));
}

function getAuthoritiesByRoleIds(roleIds) {
    return executeSQLQueryParameterized(
        `SELECT AUTHORITIES.title FROM ROLE_AUTHORITIES LEFT JOIN AUTHORITIES ON ROLE_AUTHORITIES.authority_id=AUTHORITIES.id WHERE ROLE_AUTHORITIES.role_id in (${roleIds})`,
    ).catch((error) => {
        logger.error(`getAuthoritiesByRoleIds: ${error}`);
        return [];
    });
}

function prepareSearchLikeQuery(search, query) {
    if (!!search) {
        query.push("WHERE");
        query.push(`(${["full_name", "email", "phone"].map((key) => `${key} LIKE '%${search}%'`).join(" OR ")})`);
    }
}

function prepareFiltersWhereQuery(appliedFilters, search, query) {
    const { roles, branches, active, courses, dues, range } = appliedFilters;

    if (roles || branches || active || courses || dues || range) {
        //if priviously search is applied then we need to add AND
        query.push(!!search ? "AND" : "WHERE");

        const filterQueries = [];

        if (roles) {
            filterQueries.push(`USER_ROLES.role_id in (${roles})`);
        }

        if (branches) {
            filterQueries.push(`USERS.branch_id in (${branches})`);
        }

        if (active) {
            filterQueries.push(`USERS.active in (${active})`);
        }

        if (courses) {
            filterQueries.push(`ENROLLMENT_COURSES.course_id in (${courses})`);
        }

        if (dues) {
            filterQueries.push(
                `EXISTS (SELECT 1 FROM ENROLLMENTS LEFT JOIN ENROLLMENT_TRANSACTIONS ON ENROLLMENTS.id = ENROLLMENT_TRANSACTIONS.enrollment_id WHERE ENROLLMENTS.user_id = USERS.id GROUP BY ENROLLMENTS.id HAVING COALESCE(SUM(ENROLLMENT_TRANSACTIONS.amount),0) ${dues} ENROLLMENTS.amount)`,
            );
        }

        if (range) {
            const dates = range.split(",");
            filterQueries.push(`USERS.created_on BETWEEN '${getFormattedDate({ date: dates[0] })}' AND '${getFormattedDate({ date: dates[1] })}'`);
        }

        query.push(filterQueries.join(" AND "));
    }
}

function prepareOrderByQuery(appliedFilters, query) {
    const { id } = appliedFilters;

    if (id) {
        query.push("ORDER BY");

        const orderByQueries = [];

        if (!!id) {
            orderByQueries.push(`USERS.id ${id}`);
        }

        query.push(orderByQueries.join(" , "));
    } else {
        //default sorting order if no sorting is given
        query.push("ORDER BY USERS.id DESC");
    }
}

async function getAllUsersBySearchAndFilters(search, appliedFilters, offSet, limit) {
    const query = [
        `SELECT DISTINCT USERS.* FROM USERS LEFT JOIN USER_ROLES ON USERS.id=USER_ROLES.user_id LEFT JOIN INQUIRIES ON USERS.id=INQUIRIES.user_id LEFT JOIN ENROLLMENTS ON USERS.id=ENROLLMENTS.user_id LEFT JOIN ENROLLMENT_COURSES ON ENROLLMENTS.id=ENROLLMENT_COURSES.enrollment_id`,
    ];
    const parameters = [];

    prepareSearchLikeQuery(search, query);

    prepareFiltersWhereQuery(appliedFilters, search, query);

    prepareOrderByQuery(appliedFilters, query);

    if (offSet && limit) {
        query.push(`LIMIT ?`);
        parameters.push(limit);
        query.push(`OFFSET ?`);
        parameters.push(offSet);
    }

    const users = await executeSQLQueryParameterized(query.join(" "), parameters);

    for (const user of users) {
        user.inquiries = await getInquiriesByUserId({ user_id: user.id });
    }

    return users;
}

function getCountUsersBySearchAndFilters(search, appliedFilters) {
    const query = [
        `SELECT COUNT(DISTINCT USERS.id) AS count FROM USERS LEFT JOIN USER_ROLES ON USERS.id=USER_ROLES.user_id LEFT JOIN INQUIRIES ON USERS.id=INQUIRIES.user_id LEFT JOIN ENROLLMENTS ON USERS.id=ENROLLMENTS.user_id LEFT JOIN ENROLLMENT_COURSES ON ENROLLMENTS.id=ENROLLMENT_COURSES.enrollment_id`,
    ];
    const parameters = [];

    prepareSearchLikeQuery(search, query);

    prepareFiltersWhereQuery(appliedFilters, search, query, parameters);

    return executeSQLQueryParameterized(query.join(" "), parameters)
        .then(([result]) => result.count)
        .catch((error) => {
            logger.error(`getCountUsersBySearchAndFilters: ${error}`);
            return 0;
        });
}

//freeze
function updateUserById({ id, email, full_name, phone, image, address, branch_id, stream_selection_test_allowed = false, active }) {
    return executeSQLQueryParameterized(
        `UPDATE USERS SET email=?, full_name=?,phone=?,image=?,address=?,branch_id=?,stream_selection_test_allowed=?,active=? WHERE id = ?`,
        [email?.toLowerCase(), full_name, phone, image || null, address, branch_id, stream_selection_test_allowed, active, id],
    ).catch((error) => logger.error(`updateUserById: ${error}`));
}

//freeze
function patchUserFullNameById({ id, full_name }) {
    return executeSQLQueryParameterized(`UPDATE USERS SET full_name=? WHERE id = ?`, [full_name, id]).catch((error) =>
        logger.error(`patchUserFullNameById: ${error}`),
    );
}

//freeze
function patchUserPhoneById({ id, phone }) {
    return executeSQLQueryParameterized(`UPDATE USERS SET phone=? WHERE id = ?`, [phone, id]).catch((error) => logger.error(`patchUserPhoneById: ${error}`));
}

//freeze
function patchUserStreamSelectionTestAllowedById({ id, stream_selection_test_allowed }) {
    return executeSQLQueryParameterized(`UPDATE USERS SET stream_selection_test_allowed=? WHERE id = ?`, [stream_selection_test_allowed, id]).catch((error) =>
        logger.error(`patchUserStreamSelectionTestAllowedById: ${error}`),
    );
}

//freeze
function addUser({ email, full_name, phone, image = null, address, branch_id=null }) {
    return executeSQLQueryParameterized(`INSERT  INTO USERS(email,full_name, phone, image, address, branch_id) VALUES(?,?,?,?,?,?)`, [
        email?.toLowerCase(),
        full_name,
        phone,
        image,
        address,
        branch_id,
    ])
        .then((result) => {
            result?.affectedRows && addDefaultRoleToUser(result?.insertId);
            return result?.insertId;
        })
        .catch((error) => logger.error(`addUser: ${error}`));
}

module.exports = {
    getAllUsersBySearchAndFilters,
    getCountUsersBySearchAndFilters,
    getUserByEmail,
    getUserByAuthenticationToken,
    getGroupsById,
    getUserByTransactionId,
    addUserByEmail,
    getUserById,
    getAuthoritiesByRoleIds,
    updateUserById,
    addUser,
    patchUserFullNameById,
    patchUserPhoneById,
    patchUserStreamSelectionTestAllowedById,
};
