import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import OpenAI from "openai";

// Lightweight classifier used by the bulk "AI: tag difficulty" action. It only
// returns a level (easy/medium/hard) — far cheaper than regenerating
// explanations just to get a difficulty.
export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY is not configured. Add it to your Vercel environment variables.",
      },
      { status: 503 }
    );
  }

  const { question, optionA, optionB, optionC, optionD, answer, subjectName, topicName } =
    await request.json();

  if (!question) {
    return NextResponse.json({ error: "Missing question." }, { status: 400 });
  }

  const prompt = `You rate the difficulty of entrance-exam MCQs.

Subject: ${subjectName || "(unspecified)"}  |  Topic: ${topicName || "(unspecified)"}
Question: ${question}
A) ${optionA ?? ""}
B) ${optionB ?? ""}
C) ${optionC ?? ""}
D) ${optionD ?? ""}
Correct answer: ${answer ?? "(unknown)"}

Classify it as EXACTLY one of:
- "easy": direct recall, a definition, or a single-step question; correct option is obvious.
- "medium": needs 2–3 steps or applying one concept; plausible distractors.
- "hard": multi-step / multi-concept reasoning, calculation-heavy, or tricky distractors.

Respond with valid JSON only, exactly: {"difficulty":"easy|medium|hard"}`;

  const client = new OpenAI({ apiKey });

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0,
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const difficulty = ["easy", "medium", "hard"].includes(parsed.difficulty)
      ? parsed.difficulty
      : "medium";
    return NextResponse.json({ difficulty });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Tagging failed: ${message}` },
      { status: 500 }
    );
  }
}
