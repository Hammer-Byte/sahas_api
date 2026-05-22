function buildExamSeriesMeritList({ exams = [], submissionMarks = [] }) {
    const totalExams = exams.length;
    if (!totalExams) {
        return [];
    }

    const usersById = new Map();

    submissionMarks.forEach(({ user_id, full_name, exam_id, exam_marks }) => {
        if (!usersById.has(user_id)) {
            usersById.set(user_id, { user_id, full_name, marksByExamId: new Map() });
        }

        const user = usersById.get(user_id);
        user.marksByExamId.set(exam_id, Number(exam_marks) || 0);
        if (full_name) {
            user.full_name = full_name;
        }
    });

    const meritList = [...usersById.values()].map((user) => {
        const exam_scores = exams.map((exam) => ({
            exam_id: exam.id,
            subject_title: exam.subject_title,
            marks: user.marksByExamId.get(exam.id) ?? 0,
        }));

        const total_marks = exam_scores.reduce((sum, examScore) => sum + examScore.marks, 0);
        const average = total_marks / totalExams;

        return {
            user_id: user.user_id,
            full_name: user.full_name,
            exam_scores,
            total_marks,
            average,
        };
    });

    meritList.sort((first, second) => {
        if (second.average !== first.average) {
            return second.average - first.average;
        }

        return second.total_marks - first.total_marks;
    });

    return meritList.map((entry, index) => ({
        ...entry,
        rank: index + 1,
        average: Number(entry.average.toFixed(2)),
    }));
}

module.exports = {
    buildExamSeriesMeritList,
};
