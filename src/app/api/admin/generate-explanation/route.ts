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
   right. This is what students see first. Bold the single most important term/phrase with **double
   asterisks**.

2. "longExplanation" — a THOROUGH explanation that builds deep understanding of the concept, not
   just this question. FORMAT IT AS 3 TO 5 SHORT PARAGRAPHS separated by a blank line (use "\n\n"
   between paragraphs — never return one big block). A good structure:
   - Para 1: the core concept and why the correct answer is right.
   - Para 2: a concrete EXAMPLE, analogy, or worked illustration that makes it click.
   - Para 3: briefly why each other option is wrong / what it actually is.
   - Para 4 (optional): related context, a formula, or a common exam trap to avoid.
   Keep each paragraph short (2–4 sentences) and easy to read. Add an example wherever it aids
   understanding. **Bold the most important keywords, key terms, and any critical sentence** with
   double asterisks so students don't miss them — but don't over-bold (a few per paragraph at most).

3. "concepts" — 3 to 6 lowercase tag phrases capturing the key ideas (used to link related questions).

4. "difficulty" — classify the question as EXACTLY one of "easy", "medium", or "hard":
   - "easy": direct recall, a definition, or a single-step question; the correct option is obvious.
   - "medium": needs 2–3 steps or applying one concept; has plausible distractors.
   - "hard": multi-step / multi-concept reasoning, calculation-heavy, or has tricky distractors.

Rules: be accurate and exam-appropriate, do NOT invent facts. Use **double asterisks** ONLY to bold
important words/phrases — no other markdown (no headers, no bullets). Separate paragraphs with blank lines.

Respond with valid JSON only, exactly:
{"explanation":"...","longExplanation":"...","concepts":["...","..."],"difficulty":"easy|medium|hard"}`;

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
    const difficulty = ["easy", "medium", "hard"].includes(parsed.difficulty)
      ? (parsed.difficulty as "easy" | "medium" | "hard")
      : "medium";

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
      difficulty,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Generation failed: ${message}` },
      { status: 500 }
    );
  }
}
