const libExpress = require("express");
const { addStreamSelectionTest, addStreamSelectionTestAnswer, updateStreamSelectionTestResultById, getLatestStreamSelectionTestByUserId, getStreamSelectionTestAnswersByStreamSelectionTestId } = require("../db/stream_selection_tests");
const openai = require("../libs/openai");
const router = libExpress.Router();
const { setTimeout } = require("timers/promises");
const { logger } = require("sahas_utils");
const { patchUserStreamSelectionTestAllowedById } = require("../db/users");
const parseGuestUser = require("../middlewares/parse_guest_user");

//tested
router.post("/",parseGuestUser, async (req, res) => {
    if (req.body?.length) {
        const streamSelectionTestId = await addStreamSelectionTest({ user_id: req.user.id });

        for (const streamSelectionTestAnswer of req?.body) {
            await addStreamSelectionTestAnswer({
                stream_selection_test_id: streamSelectionTestId,
                question: streamSelectionTestAnswer?.question,
                answer: streamSelectionTestAnswer?.answer?.option,
            });
        }

        const aiInput = `You are a career guidance expert specializing in stream selection for students after 10th standard.

        Your task is to analyze a student's responses and recommend the most suitable stream.

        ### STUDENT RESPONSES:
        Below is a list of questions and answers collected from the student:

        ${req.body.map(({ question, answer }) => `Q: ${question}\nA: ${answer?.option}`).join("\n\n")}

        ### ALLOWED STREAMS:
        - Science
        - Commerce
        - Diploma
        - Arts

        ### CORE ANALYSIS INSTRUCTIONS:
        1. Carefully interpret student's:
        - Interests
        - Academic strengths/weaknesses (especially Maths & Science)
        - Personality traits
        - Study behavior (hours, pressure tolerance)
        - Career inclination
        2. Do NOT assume missing information.
        3. If something is unclear, treat it as neutral.

        ---

        ### DECISION LOGIC (VERY IMPORTANT)

        [a] COMMERCE SIGNALS:
        If answers indicate:
        - Business, money, finance, management, profit thinking
        - Moderate/less study hours preference
        - Conceptual understanding over rote learning
        - Leadership, people management
        - Interest in CA, MBA, finance, business
        - Corporate jobs or own business goals
        - Avoids pressure, enjoys social life, likes shows like Shark Tank

        → STRONGLY FAVOR COMMERCE

        ---

        [b] SCIENCE SIGNALS:
        If answers indicate:
        - Interest in Physics, Chemistry, Maths, Biology
        - Willingness for long study hours
        - Comfort with equations, problem-solving
        - Interest in engineering, medical, research
        - Likes labs, machines, human body, science content

        → STRONGLY FAVOR SCIENCE

        ---

        [c] ARTS SIGNALS:
        If answers indicate:
        - Creativity, writing, reading, history
        - Psychology, human behavior
        - Artistic or expressive interests

        → FAVOR ARTS

        ---

        [d] DIPLOMA SIGNALS:
        If answers indicate:
        - Interest in machines, tools, repairing, practical work
        - Hands-on learning preference over theory

        → FAVOR DIPLOMA

        ---

        [e] DEFAULT BIAS:
        - If signals are mixed or unclear → slightly favor COMMERCE

        ---

        ### OUTPUT RULES:
        - Return ONLY valid JSON (no explanation outside JSON)
        - Suggestion must be under 50 words
        - Each feedback item must be 15-20 words
        - Provide 2-3 feedback points per stream
        - Use simple, student-friendly language
        - Be practical and realistic

        ---

        ### OUTPUT FORMAT:
        {
        "suggestion": "<direct advice to student>",
        "suitable_stream": "<stream with highest percentage>",
        "analysis": [
            {
            "stream": "<stream name>",
            "score": "<percentage>",
            "feedback": [
                "<feedback point 1>",
                "<feedback point 2>",
                "<feedback point 3>"
            ]
            }
        ]
        }

        ---

        ### STRICT CONSTRAINTS:
        - Total score must equal 100%
        - Include ALL 4 streams
        - Order by score (highest first)
        - "suitable_stream" must match highest score stream
        - Do not skip any stream
        - Do not return empty feedback arrays

        ---

        ### NOW ANALYZE THE RESPONSES AND RETURN JSON ONLY.`

        logger.info(`Applying Input to AI - ${aiInput}`)

        const response = await openai.responses.create({
            model: "gpt-4.1",
            input: aiInput,
        });

        await updateStreamSelectionTestResultById({ id: streamSelectionTestId, result: response.output[0].content[0].text });

        //update user that stream selection test is taken
        patchUserStreamSelectionTestAllowedById({ stream_selection_test_allowed: false, id: req.user.id });

        //Fake Delay
        //await setTimeout(1000);


        const streamSelectionTest = await getLatestStreamSelectionTestByUserId({ user_id: req?.user?.id });
        streamSelectionTest.answers = await getStreamSelectionTestAnswersByStreamSelectionTestId({ stream_selection_test_id: streamSelectionTest?.id });
        return res.status(201).json(streamSelectionTest);

    }

    return res.status(400).json({ error: "Missing Test Questions" });
});

module.exports = router;
