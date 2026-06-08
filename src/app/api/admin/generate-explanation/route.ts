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
${explanation ? `Existing short explanation (you may improve it): ${explanation}` : ""}

Produce TWO explanations and concept tags:

1. "explanation" — a SHORT explanation: 1 to 2 crisp sentences stating why the correct answer is
   right. This is what students see first.

2. "longExplanation" — a THOROUGH explanation (4 to 8 sentences) that builds deep understanding of
   the concept, not just this question:
   - why the correct answer is correct, grounded in the concept;
   - briefly why each other option is wrong / what it actually is;
   - the surrounding concept, a useful intuition or analogy, and a common exam trap.

3. "concepts" — 3 to 6 lowercase tag phrases capturing the key ideas (used to link related questions).

Rules: be accurate and exam-appropriate, do NOT invent facts, plain text (no markdown headers).

Respond with valid JSON only, exactly:
{"explanation":"...","longExplanation":"...","concepts":["...","..."]}`;

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

    const shortExplanation =
      typeof parsed.explanation === "string" ? parsed.explanation.trim() : "";
    const longExplanation =
      typeof parsed.longExplanation === "string" ? parsed.longExplanation.trim() : "";
    const concepts = Array.isArray(parsed.concepts)
      ? parsed.concepts
          .map((c: unknown) => String(c).trim().toLowerCase())
          .filter(Boolean)
      : [];

    if (!longExplanation && !shortExplanation) {
      return NextResponse.json(
        { error: "AI returned an empty explanation.", raw: content },
        { status: 500 }
      );
    }

    return NextResponse.json({
      explanation: shortExplanation,
      longExplanation,
      concepts,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Generation failed: ${message}` },
      { status: 500 }
    );
  }
}
