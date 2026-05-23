function buildExamSeriesResult({ rows = [] }) {
    const examsById = new Map();

    rows.forEach((row) => {
        if (!examsById.has(row.exam_id)) {
            examsById.set(row.exam_id, {
                id: row.exam_id,
                exam_series_id: row.exam_series_id,
                subject_id: row.subject_id,
                subject_title: row.subject_title,
                start_at: row.start_at,
                end_at: row.end_at,
                total_marks: 0,
                questions: [],
            });
        }

        if (!row.question_id) {
            return;
        }

        const exam = examsById.get(row.exam_id);
        const marks = row.marks == null ? 0 : Number(row.marks);

        exam.questions.push({
            id: row.question_id,
            question: row.question,
            correct_choice: row.correct_choice,
            submitted_answer: row.submitted_answer ?? null,
            marks,
        });

        exam.total_marks += marks;
    });

    return [...examsById.values()];
}

module.exports = {
    buildExamSeriesResult,
};
