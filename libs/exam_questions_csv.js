const axios = require("axios");
const { parse } = require("csv-parse/sync");

const BULK_CSV_FIELDS = ["question", "choice_one", "choice_two", "choice_three", "choice_four", "correct_choice"];

function normalizeCsvHeader(header) {
    return String(header || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
}

function normalizeCsvRecord(record) {
    const normalized = {};

    Object.entries(record).forEach(([key, value]) => {
        normalized[normalizeCsvHeader(key)] = typeof value === "string" ? value.trim() : value;
    });

    return {
        question: normalized.question,
        choice_one: normalized.choice_one,
        choice_two: normalized.choice_two,
        choice_three: normalized.choice_three,
        choice_four: normalized.choice_four,
        correct_choice: normalized.correct_choice,
    };
}

async function fetchExamQuestionsFromCsvUrl({ csv_url }) {
    const response = await axios.get(csv_url);
    const records = parse(response.data, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });

    if (!records?.length) {
        return { error: "CSV Has No Records" };
    }

    const questions = records.map(normalizeCsvRecord);

    for (let index = 0; index < questions.length; index++) {
        const row = questions[index];
        const missingFields = BULK_CSV_FIELDS.filter((field) => !row[field]);

        if (missingFields.length) {
            return { error: `Row ${index + 1} is missing ${missingFields.join(", ")}` };
        }
    }

    return { questions };
}

module.exports = {
    BULK_CSV_FIELDS,
    fetchExamQuestionsFromCsvUrl,
};
