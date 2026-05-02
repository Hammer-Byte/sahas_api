const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

async function getTokenByOTP(token, otp) {
    //Check if such token is there
    return executeSQLQueryParameterized(`SELECT * FROM AUTHENTICATION_TOKENS WHERE token = ? AND otp=? AND active=FALSE  AND validity > CURRENT_TIMESTAMP;`, [
        token,
        otp,
    ])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getTokenByOTP: ${error}`);
            return false;
        });
}

async function activateToken(token) {
    //Activate Token
    return executeSQLQueryParameterized(`UPDATE AUTHENTICATION_TOKENS SET active = TRUE WHERE token = ?`, [token]).catch((error) =>
        logger.error(`activateToken: ${error}`)
    );
}

async function addInactiveToken({user_id, otp=null, token, validity  }) {
    return executeSQLQueryParameterized(`INSERT INTO AUTHENTICATION_TOKENS(user_id,otp,token,validity) VALUES(?,?,?,?)`, [user_id, otp, token, validity]).catch((error) => {
        logger.error(`addInactiveToken: ${error}`);
        
    });
}

module.exports = { addInactiveToken, activateToken, getTokenByOTP };
