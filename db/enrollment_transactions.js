const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

//freeze
function getTransactionsByEnrollmentId({ enrollment_id }) {
    return executeSQLQueryParameterized(
        `SELECT ENROLLMENT_TRANSACTIONS.*,USERS.full_name AS created_by_full_name FROM ENROLLMENT_TRANSACTIONS LEFT JOIN USERS ON ENROLLMENT_TRANSACTIONS.created_by=USERS.id WHERE enrollment_id=?`,
        [enrollment_id],
    ).catch((error) => {
        logger.error(`getTransactionsByEnrollmentId: ${error}`);
        return [];
    });
}

//freeze
function addEnrollmentTransaction({ enrollment_id, amount, cgst, sgst, created_by, coupon_code = null, discount = 0, note, type, image = null }) {
    return executeSQLQueryParameterized(
        `INSERT INTO ENROLLMENT_TRANSACTIONS(enrollment_id,amount,cgst,sgst,created_by,coupon_code,discount,note,type,image) VALUES(?,?,?,?,?,?,?,?,?,?)`,
        [enrollment_id, amount, cgst, sgst, created_by, coupon_code, discount, note, type, image],
    )
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addEnrollmentTransaction: ${error}`));
}

//freeze
function updateEnrollmentTransactionInvoiceById({ id, invoice }) {
    return executeSQLQueryParameterized(`UPDATE ENROLLMENT_TRANSACTIONS SET invoice=? where id=?`, [invoice, id]).catch((error) =>
        logger.error(`updateEnrollmentTransactionInvoiceById: ${error}`),
    );
}

//freeze
function getEnrollmentTransactionById({ id }) {
    return executeSQLQueryParameterized(
        "SELECT ENROLLMENT_TRANSACTIONS.*,USERS.full_name AS created_by_full_name FROM ENROLLMENT_TRANSACTIONS LEFT JOIN USERS ON ENROLLMENT_TRANSACTIONS.created_by = USERS.id WHERE ENROLLMENT_TRANSACTIONS.id=? ",
        [id],
    )
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => logger.error(`getEnrollmentTransactionById: ${error}`));
}

//freeze
function getEnrollmentTransactionsForInterval({ start_date, end_date, order_by = "DESC" }) {
    return executeSQLQueryParameterized(
        `SELECT 
            ENROLLMENT_TRANSACTIONS.id,
            ENROLLMENT_TRANSACTIONS.enrollment_id,
            ENROLLMENTS.user_id,
            ENROLLMENTS.handler, 
            ENROLLMENT_TRANSACTIONS.original,
            ENROLLMENT_TRANSACTIONS.cgst,
            ENROLLMENT_TRANSACTIONS.sgst,
            ENROLLMENT_TRANSACTIONS.amount,
            ENROLLMENT_TRANSACTIONS.type,
            ENROLLMENT_TRANSACTIONS.invoice, 
            ENROLLMENT_TRANSACTIONS.manually_verified, 
            ENROLLMENT_TRANSACTIONS.created_on, 
            USERS.full_name,
            CREATORS.id as created_by_id,
            CREATORS.full_name as created_by_full_name
        FROM ENROLLMENT_TRANSACTIONS 
        LEFT JOIN ENROLLMENTS 
            ON ENROLLMENT_TRANSACTIONS.enrollment_id = ENROLLMENTS.id 
        LEFT JOIN USERS 
            ON ENROLLMENTS.user_id = USERS.id 
        LEFT JOIN USERS AS CREATORS 
            ON ENROLLMENTS.created_by = CREATORS.id 
        WHERE ENROLLMENT_TRANSACTIONS.type NOT IN ('SCH','DIS') AND ENROLLMENT_TRANSACTIONS.created_on BETWEEN ? AND ? 
        ORDER BY ENROLLMENT_TRANSACTIONS.created_on ${order_by}`,
        [start_date, end_date],
    ).catch((error) => logger.error(`getEnrollmentTransactionsForInterval: ${error}`));
}

//freeze
function updateEnrollmentTransactionVerificationById({ manually_verified, id }) {
    return executeSQLQueryParameterized(`UPDATE ENROLLMENT_TRANSACTIONS SET manually_verified=? WHERE id=?`, [manually_verified, id]).catch((error) =>
        logger.error(`updateEnrollmentTransactionVerificationById: ${error}`),
    );
}

module.exports = {
    addEnrollmentTransaction,
    getTransactionsByEnrollmentId,
    getEnrollmentTransactionById,
    updateEnrollmentTransactionInvoiceById,
    getEnrollmentTransactionsForInterval,
    updateEnrollmentTransactionVerificationById,
};
