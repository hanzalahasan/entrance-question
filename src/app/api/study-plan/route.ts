import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import OpenAI from "openai";

// Generates a granular, AI-written study plan from a user's weak/strong topics.
// User-facing (not admin) — it only receives aggregated accuracy numbers, no PII.
type TopicStat = {
  subjectName: string;
  topicName: string;
  accuracy: number;
  attempted: number;
  correct: number;
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 503 }
    );
  }

  const {
    accuracy,
    attempted,
    weaknesses = [],
    strengths = [],
  } = (await request.json()) as {
    accuracy: number;
    attempted: number;
    weaknesses: TopicStat[];
    strengths: TopicStat[];
  };

  if (!attempted || (weaknesses.length === 0 && strengths.length === 0)) {
    return NextResponse.json(
      { error: "Not enough practice yet to build a study plan." },
      { status: 422 }
    );
  }

  const fmt = (t: TopicStat) =>
    `${t.subjectName} → ${t.topicName}: ${t.accuracy}% (${t.correct}/${t.attempted})`;

  const prompt = `You are an exam coach for students preparing for Nepal's medical/science entrance exams (MECEE-BL / CEE).

A student's performance so far (overall ${accuracy}% across ${attempted} attempted questions):

WEAK topics (lowest accuracy):
${weaknesses.map(fmt).join("\n") || "(none flagged)"}

STRONG topics:
${strengths.map(fmt).join("\n") || "(none yet)"}

Write a concise, encouraging, ACTIONABLE study plan. Return JSON only, exactly:
{
  "summary": "2-3 sentences: overall standing + the single biggest priority. Encouraging but honest.",
  "items": [
    {
      "subjectName": "...",
      "topicName": "...",
      "advice": "2-3 sentences specific to THIS topic: what core concepts/formulas to revise, a concrete way to practice (e.g. 'do 15 targeted MCQs, then review every wrong one's explanation'), and one common exam trap to watch. Be specific to the topic, not generic."
    }
  ]
}
Cover each WEAK topic (most important first). Keep it practical and exam-focused. Do not invent topics the student didn't practice.`;

  const client = new OpenAI({ apiKey });
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    const items = Array.isArray(parsed.items)
      ? parsed.items
          .map((i: Record<string, unknown>) => ({
            subjectName: String(i.subjectName ?? "").trim(),
            topicName: String(i.topicName ?? "").trim(),
            advice: String(i.advice ?? "").trim(),
          }))
          .filter((i: { advice: string }) => i.advice)
      : [];
    if (!summary && items.length === 0) {
      return NextResponse.json(
        { error: "The AI returned an empty plan. Try again." },
        { status: 500 }
      );
    }
    return NextResponse.json({ summary, items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Could not generate the plan: ${message}` },
      { status: 500 }
    );
  }
}
