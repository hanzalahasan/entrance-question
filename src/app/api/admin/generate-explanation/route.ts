import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import OpenAI from "openai";

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

  const {
    question,
    optionA,
    optionB,
    optionC,
    optionD,
    answer,
    explanation,
    subjectName,
    topicName,
  } = await request.json();

  if (!question || !answer) {
    return NextResponse.json(
      { error: "Missing question or answer." },
      { status: 400 }
    );
  }

  const prompt = `You are an expert tutor preparing students for competitive entrance exams.

Subject: ${subjectName || "(unspecified)"}  |  Topic: ${topicName || "(unspecified)"}

Question: ${question}
A) ${optionA ?? ""}
B) ${optionB ?? ""}
C) ${optionC ?? ""}
D) ${optionD ?? ""}
Correct answer: ${answer}
${explanation ? `Existing short explanation: ${explanation}` : ""}

Write a thorough "long explanation" that helps a student deeply understand the underlying concept — not just this question. Requirements:
- 4 to 8 sentences (or short paragraphs).
- Explain WHY the correct answer is correct, grounded in the concept.
- Briefly explain why the other options are wrong / what they actually are.
- Add the surrounding concept, a useful intuition or analogy, and any common exam trap.
- Be accurate and exam-appropriate. Do NOT invent facts. Plain text (no markdown headers).

Also produce 3 to 6 lowercase "concepts" (short tag phrases) that capture the key ideas, used to link related questions.

Respond with valid JSON only, exactly:
{"longExplanation":"...","concepts":["...","..."]}`;

  const client = new OpenAI({ apiKey });

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);

    const longExplanation =
      typeof parsed.longExplanation === "string" ? parsed.longExplanation.trim() : "";
    const concepts = Array.isArray(parsed.concepts)
      ? parsed.concepts
          .map((c: unknown) => String(c).trim().toLowerCase())
          .filter(Boolean)
      : [];

    if (!longExplanation) {
      return NextResponse.json(
        { error: "AI returned an empty explanation.", raw: content },
        { status: 500 }
      );
    }

    return NextResponse.json({ longExplanation, concepts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Generation failed: ${message}` },
      { status: 500 }
    );
  }
}
