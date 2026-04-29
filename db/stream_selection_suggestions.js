const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

//freeze
function getAllStreamSelectionSuggestions() {
    return executeSQLQueryParameterized("SELECT * FROM STREAM_SELECTION_SUGGESTIONS ORDER BY view_index ASC").catch((error) => {
        logger.error(`getAllStreamSelectionSuggestions: ${error}`);
        return [];
    });
}

//freeze
function getStreamSelectionSuggestionById({ id }) {
    return executeSQLQueryParameterized("SELECT * FROM STREAM_SELECTION_SUGGESTIONS WHERE id = ?", [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => logger.error(`getStreamSelectionSuggestionById: ${error}`));
}

//freeze
function addStreamSelectionSuggestion({ title, pdf }) {
    return executeSQLQueryParameterized("INSERT INTO STREAM_SELECTION_SUGGESTIONS(title,pdf) VALUES(?,?) ", [title, pdf])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addStreamSelectionSuggestion: ${error}`);
            return false;
        });
}

//freeze
function updateStreamSelectionSuggestionById({ id, title, pdf }) {
    return executeSQLQueryParameterized("UPDATE STREAM_SELECTION_SUGGESTIONS SET title=?, pdf=? WHERE id=?", [title, pdf, id]).catch((error) =>
        logger.error(`updateStreamSelectionSuggestionById: ${error}`),
    );
}

//freeze
function updateStreamSelectionSuggestionViewIndexById({ id, view_index }) {
    return executeSQLQueryParameterized("UPDATE STREAM_SELECTION_SUGGESTIONS SET view_index=? WHERE id=?", [view_index, id]).catch((error) =>
        logger.error(`updateStreamSelectionSuggestionViewIndexById: ${error}`),
    );
}

//freeze
function deleteStreamSelectionSuggestionById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM STREAM_SELECTION_SUGGESTIONS WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteStreamSelectionSuggestionById: ${error}`);
    });
}

module.exports = {
    getAllStreamSelectionSuggestions,
    getStreamSelectionSuggestionById,
    addStreamSelectionSuggestion,
    updateStreamSelectionSuggestionById,
    updateStreamSelectionSuggestionViewIndexById,
    deleteStreamSelectionSuggestionById,
};
