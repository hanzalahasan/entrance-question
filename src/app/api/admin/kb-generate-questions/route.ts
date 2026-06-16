import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import OpenAI from "openai";

import { retrieveChunks, buildContextBlock } from "@/services/rag-service";
import type {
  KbGenerateRequest,
  GeneratedQuestion,
} from "@/types/knowledge-base";

// Phase 2 — book-grounded question generation (blueprint/TRAINING-MODULE-PLAN.md
// §4.2, §8, §9). Retrieves Knowledge Base passages for the chosen subject/topic,
// then has the LLM write MCQs grounded in them. Output is REVIEW-ONLY: the admin
// UI saves the kept questions as drafts — nothing here publishes anything.
export const maxDuration = 60;

const MAX_COUNT = 20;

const RUBRIC = `Difficulty rubric:
- "easy": direct recall, a definition, or a single-step question; the correct option is obvious.
- "medium": needs 2–3 steps or applying one concept; has plausible distractors.
- "hard": multi-step / multi-concept reasoning, calculation-heavy, or tricky distractors.`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 503 }
    );
  }

  const body = (await request.json()) as KbGenerateRequest;
  const {
    subjectId,
    subjectName,
    topicName,
    chapter,
    difficulty = "mixed",
    count,
  } = body;

  if (!subjectName || !topicName) {
    return NextResponse.json(
      { error: "Subject and topic are required." },
      { status: 400 }
    );
  }
  const n = Math.max(1, Math.min(MAX_COUNT, Number(count) || 5));

  const client = new OpenAI({ apiKey });

  // 1) Retrieve grounding passages for this subject/topic/chapter -------------
  const query = [subjectName, topicName, chapter, "key concepts and facts"]
    .filter(Boolean)
    .join(" — ");
  const retrieved = await retrieveChunks(client, query, {
    subjectId: typeof subjectId === "number" ? subjectId : null,
    matchCount: 10,
  });

  const grounded = retrieved.length > 0;
  const citations = retrieved.map((c) => ({
    sourceId: c.sourceId,
    title: c.title,
    citationLabel: c.citationLabel,
    chapter: c.chapter,
    trustTier: c.trustTier,
  }));

  // 2) Build the generation prompt -------------------------------------------
  const difficultyInstruction =
    difficulty === "mixed"
      ? `Produce a SPREAD of difficulties across the set (a mix of easy, medium, and hard). Classify each question's "difficulty" honestly using the rubric.`
      : `Target difficulty "${difficulty}" for EVERY question. Still set each "difficulty" field, and if a question genuinely lands at another level, label it truthfully.`;

  const groundingBlock = grounded
    ? `GROUNDING — base the questions ONLY on facts supported by these reference passages from trusted books. Paraphrase in your own words; do NOT copy long verbatim text. If two passages disagree on a fact, do NOT build a question whose correct answer depends on the disputed point — instead set "sourcesDisagree": true for any question you do write near it, and pick the higher trust-tier reading.\n\n${buildContextBlock(
        retrieved
      )}`
    : `No book passages were retrieved for this topic, so rely on well-established, exam-standard facts only. Do NOT invent niche claims. Set "citation" to null and "sourcesDisagree" to false.`;

  const prompt = `You are an expert item-writer creating multiple-choice questions for a competitive medical/science entrance exam (MECEE-BL / CEE style).

Subject: ${subjectName}  |  Topic: ${topicName}${chapter ? `  |  Chapter: ${chapter}` : ""}

${groundingBlock}

Write EXACTLY ${n} original MCQs about the topic above.
${difficultyInstruction}
${RUBRIC}

Rules for every question:
- Exactly 4 options. Exactly ONE is correct. Distractors must be plausible, not obviously wrong.
- "answer" is the letter of the correct option ("A", "B", "C", or "D").
- "explanation": 1–2 crisp sentences on why the answer is right. Bold the single most important term with **double asterisks**.
- "longExplanation": 2–4 short paragraphs (separated by "\\n\\n") building real understanding — core concept, an example/analogy, and why the other options are wrong. Use **double asterisks** to bold key terms; no other markdown.
- "concepts": 3–6 lowercase tag phrases.
- "difficulty": "easy" | "medium" | "hard" per the rubric.
- "sourcesDisagree": true ONLY if the grounding passages conflict on a fact relevant to this question; otherwise false.
- "citation": the citation label of the passage you grounded this question in (copy it from the GROUNDING block headers, e.g. "Physics NCERT, Ch 4"), or null if ungrounded.
- Be factually correct and exam-appropriate. Do NOT invent facts.

Respond with valid JSON only, exactly:
{"questions":[{"question":"...","optionA":"...","optionB":"...","optionC":"...","optionD":"...","answer":"A","explanation":"...","longExplanation":"...","concepts":["..."],"difficulty":"easy|medium|hard","sourcesDisagree":false,"citation":"... or null"}]}`;

  // 3) Generate ---------------------------------------------------------------
  let parsed: { questions?: unknown };
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 4096,
    });
    parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Generation failed: ${message}` },
      { status: 500 }
    );
  }

  // 4) Normalise + validate each question ------------------------------------
  const raw = Array.isArray(parsed.questions) ? parsed.questions : [];
  const questions: GeneratedQuestion[] = [];

  for (const item of raw) {
    const q = item as Record<string, unknown>;
    const text = String(q.question ?? "").trim();
    const optionA = String(q.optionA ?? "").trim();
    const optionB = String(q.optionB ?? "").trim();
    const optionC = String(q.optionC ?? "").trim();
    const optionD = String(q.optionD ?? "").trim();
    const answer = String(q.answer ?? "").trim().toUpperCase();

    // Drop incomplete items rather than ship a question that can't be saved.
    if (!text || !optionA || !optionB || !optionC || !optionD) continue;
    if (!["A", "B", "C", "D"].includes(answer)) continue;

    questions.push({
      question: text,
      optionA,
      optionB,
      optionC,
      optionD,
      answer: answer as GeneratedQuestion["answer"],
      explanation: String(q.explanation ?? "").trim(),
      longExplanation: String(q.longExplanation ?? "").trim(),
      concepts: Array.isArray(q.concepts)
        ? q.concepts.map((c) => String(c).trim().toLowerCase()).filter(Boolean)
        : [],
      difficulty: ["easy", "medium", "hard"].includes(q.difficulty as string)
        ? (q.difficulty as GeneratedQuestion["difficulty"])
        : difficulty === "mixed"
          ? "medium"
          : difficulty,
      sourcesDisagree: q.sourcesDisagree === true,
      citation:
        typeof q.citation === "string" && q.citation.trim()
          ? q.citation.trim()
          : null,
    });
  }

  if (questions.length === 0) {
    return NextResponse.json(
      { error: "The AI returned no usable questions. Try again or add more sources." },
      { status: 422 }
    );
  }

  return NextResponse.json({ questions, grounded, citations });
}
