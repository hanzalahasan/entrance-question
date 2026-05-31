import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import OpenAI from "openai";

const EXTRACT_PROMPT = `You are an expert at reading exam question papers.

Extract ALL multiple-choice questions from this document.

For each question return:
- question: full question text (clean, no numbering prefix)
- optionA: text for option A
- optionB: text for option B
- optionC: text for option C
- optionD: text for option D
- answer: the correct answer key if visible in the document (A, B, C, or D), otherwise leave empty string
- explanation: explanation if visible in the document, otherwise leave empty string

Rules:
- Extract every question you find, even if answer is not shown
- Clean up OCR artifacts and fix obvious typos
- If an option label uses 1/2/3/4 or i/ii/iii/iv instead of A/B/C/D, map them in order
- If fewer than 4 options exist for a question, fill missing ones with empty strings
- Do NOT invent answers or explanations — only include what is in the document

Respond with a valid JSON array only. No prose, no markdown.
Example: [{"question":"What is...","optionA":"...","optionB":"...","optionC":"...","optionD":"...","answer":"B","explanation":""}]`;

async function extractFromImage(openai: OpenAI, base64: string, mimeType: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" },
          },
          { type: "text", text: EXTRACT_PROMPT },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 4096,
  });

  return response.choices[0]?.message?.content ?? "{}";
}

async function extractFromPdfText(openai: OpenAI, text: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `${EXTRACT_PROMPT}\n\nDocument text:\n\n${text.slice(0, 12000)}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 4096,
  });

  return response.choices[0]?.message?.content ?? "{}";
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured. Add it to your Vercel environment variables." },
      { status: 503 }
    );
  }

  const { base64, mimeType } = await request.json();

  if (!base64 || !mimeType) {
    return NextResponse.json({ error: "Missing base64 or mimeType." }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey });

  try {
    let raw = "{}";

    if (mimeType === "application/pdf") {
      // Try text extraction first (works for digital PDFs)
      try {
        // Dynamic import to avoid Vercel build issues with pdf-parse
        const { PDFParse } = await import("pdf-parse");
        const buffer = Buffer.from(base64, "base64");
        const parser = new PDFParse({ data: buffer });
        const parsed = await parser.getText();
        const text = (parsed.text ?? "").trim();

        if (text && text.length > 50) {
          raw = await extractFromPdfText(openai, text);
        } else {
          // No text found — scanned PDF, treat as image
          return NextResponse.json({
            error:
              "This PDF appears to be scanned (no selectable text). Please take a screenshot or photo of each page and upload as an image instead.",
          }, { status: 422 });
        }
      } catch {
        return NextResponse.json({
          error: "Failed to read PDF. Try uploading a screenshot or photo of the page instead.",
        }, { status: 422 });
      }
    } else {
      // Image (jpg, png, webp, gif)
      raw = await extractFromImage(openai, base64, mimeType);
    }

    // Parse the JSON response
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON.", raw }, { status: 500 });
    }

    // Handle both {"questions":[...]} and [...] response shapes
    const questions: unknown[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.questions)
      ? (parsed.questions as unknown[])
      : Object.values(parsed).find((v) => Array.isArray(v)) as unknown[] ?? [];

    return NextResponse.json({ questions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Extraction failed: ${message}` }, { status: 500 });
  }
}
