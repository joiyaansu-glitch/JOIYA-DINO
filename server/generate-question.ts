export type QuizQuestion = {
	question: string;
	options: string[];
	correctAnswerIndex: number;
};

export type QuizData = {
	questions: QuizQuestion[];
};

export async function generateQuizQuestions(count: number): Promise<QuizData> {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		throw new Error("OPENAI_API_KEY is not set in environment variables");
	}

	const prompt = `Generate ${count} fun, engaging general knowledge trivia questions covering a mix of topics: movies, sports, history, science, geography, celebrities, and pop culture.

Return ONLY a valid JSON object with this exact structure, no markdown formatting, no code blocks, no extra text:
{
  "questions": [
    {
      "question": "question text here",
      "options": ["option A", "option B", "option C", "option D"],
      "correctAnswerIndex": 0
    }
  ]
}

Rules:
- correctAnswerIndex must be a number from 0 to 3, matching the index of the correct option in the options array
- Each question must have exactly 4 options
- Keep questions concise (under 15 words) and options short (under 5 words each)
- Make sure facts are accurate
- Vary the topics across the ${count} questions`;

	const response = await fetch("https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model: "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content:
						"You are a trivia question generator. You only respond with valid JSON, no markdown, no extra text.",
				},
				{ role: "user", content: prompt },
			],
			response_format: { type: "json_object" },
			temperature: 0.9,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
	}

	const data = (await response.json()) as {
		choices: { message: { content: string } }[];
	};
	const content = data.choices[0].message.content;
	const parsed = JSON.parse(content);

	if (!parsed.questions || !Array.isArray(parsed.questions)) {
		throw new Error("Invalid response format from OpenAI");
	}

	return parsed as QuizData;
}