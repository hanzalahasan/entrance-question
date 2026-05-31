import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import OpenAI from "openai";

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured. Add it to your Vercel environment variables." },
      { status: 503 }
    );
  }

  const { question, optionA, optionB, optionC, optionD, subjects, topics, missing } =
    await request.json();

  const subjectList = subjects.map((s: { name: string }) => s.name).join(", ");
  const topicLines = topics
    .map((t: { name: string; subjectName: string }) => `  - ${t.subjectName}: ${t.name}`)
    .join("\n");

  const prompt = `You are an educational content expert for entrance exam questions.

Given this multiple-choice question, fill in ONLY the missing fields listed below.

Question: ${question}
Option A: ${optionA}
Option B: ${optionB}
Option C: ${optionC}
Option D: ${optionD}

Available subjects (use EXACTLY one of these): ${subjectList}
Available topics (use EXACTLY one — format is "Subject: Topic"):
${topicLines}

Fields to fill: ${missing.join(", ")}

Rules:
- "answer" must be exactly A, B, C, or D — the key of the correct option
- "subject" must be exactly one of the available subjects listed above
- "topic" must be exactly one of the available topics for the chosen subject
- "explanation" should be a clear 1–3 sentence explanation of why the answer is correct
- Only return JSON with the requested missing fields — nothing else

Respond with valid JSON only. Example: {"answer":"B","subject":"Physics","topic":"Mechanics","explanation":"Newton is the SI unit of force."}`;

  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const content = completion.choices[0]?.message?.content ?? "{}";

  try {
    const filled = JSON.parse(content);
    return NextResponse.json({ filled });
  } catch {
    return NextResponse.json({ error: "AI returned invalid JSON.", raw: content }, { status: 500 });
  }
}
