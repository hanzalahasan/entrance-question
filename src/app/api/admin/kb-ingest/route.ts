import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import OpenAI from "openai";

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  chunkText,
  embedTexts,
  extractPdfText,
  ocrImage,
  extractUrlText,
} from "@/services/rag-service";
import type { KbIngestRequest } from "@/types/knowledge-base";

// Ingestion pipeline (blueprint/TRAINING-MODULE-PLAN.md §7):
//   ingest → chunk → embed → store. One source per request.
// Runs server-side because it needs the OpenAI key (embeddings + image OCR).
export const maxDuration = 60; // embeddings for a big PDF can take a while

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 503 }
    );
  }
  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json(
      {
        error:
          "Supabase isn't configured. The Knowledge Base needs the shared database (run supabase/knowledge-base-setup.sql).",
      },
      { status: 503 }
    );
  }

  const body = (await request.json()) as KbIngestRequest;
  const { type, title } = body;

  if (!type || !title?.trim()) {
    return NextResponse.json(
      { error: "Missing source type or title." },
      { status: 400 }
    );
  }

  const client = new OpenAI({ apiKey });

  // 1) Extract raw text for the given input type ----------------------------
  let text = "";
  let storagePath: string | null = null;

  try {
    if (type === "text") {
      text = (body.text ?? "").trim();
    } else if (type === "url") {
      if (!body.url?.trim()) {
        return NextResponse.json({ error: "Missing URL." }, { status: 400 });
      }
      text = await extractUrlText(body.url.trim());
      storagePath = body.url.trim();
    } else if (type === "pdf") {
      if (!body.base64) {
        return NextResponse.json({ error: "Missing PDF file." }, { status: 400 });
      }
      text = await extractPdfText(body.base64);
      if (!text || text.length < 50) {
        return NextResponse.json(
          {
            error:
              "This PDF has no selectable text (it looks scanned). Upload page photos as images instead.",
          },
          { status: 422 }
        );
      }
      storagePath = await uploadFile(body, "pdf");
    } else if (type === "image") {
      if (!body.base64 || !body.mimeType) {
        return NextResponse.json(
          { error: "Missing image file." },
          { status: 400 }
        );
      }
      text = await ocrImage(client, body.base64, body.mimeType);
      storagePath = await uploadFile(body, "image");
    } else {
      return NextResponse.json({ error: "Unknown source type." }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    return NextResponse.json(
      { error: `Could not read this source: ${message}` },
      { status: 422 }
    );
  }

  if (!text.trim()) {
    return NextResponse.json(
      { error: "No readable text was found in this source." },
      { status: 422 }
    );
  }

  // 2) Create the source row (status='processing') --------------------------
  const trustTier = [1, 2, 3].includes(body.trustTier as number)
    ? body.trustTier
    : 2;

  const { data: sourceRow, error: insertErr } = await supabase
    .from("kb_sources")
    .insert({
      title: title.trim(),
      type,
      subject_id: body.subjectId ?? null,
      subject_name: body.subjectName ?? null,
      chapter: body.chapter ?? null,
      citation_label: body.citationLabel ?? null,
      trust_tier: trustTier,
      source_url: storagePath,
      status: "processing",
    })
    .select("id")
    .single();

  if (insertErr || !sourceRow) {
    return NextResponse.json(
      {
        error: `Could not create source. Did you run supabase/knowledge-base-setup.sql? (${
          insertErr?.message ?? "unknown"
        })`,
      },
      { status: 500 }
    );
  }
  const sourceId = sourceRow.id as number;

  // 3) Chunk → embed → store ------------------------------------------------
  try {
    const chunks = chunkText(text);
    if (chunks.length === 0) throw new Error("Text produced no chunks.");

    const embeddings = await embedTexts(client, chunks);

    const rows = chunks.map((content, i) => ({
      source_id: sourceId,
      content,
      // pgvector over PostgREST expects the vector as a string literal.
      embedding: JSON.stringify(embeddings[i] ?? []),
      chapter: body.chapter ?? null,
      metadata: { index: i },
    }));

    // Insert in batches to stay well under payload limits.
    const BATCH = 100;
    for (let i = 0; i < rows.length; i += BATCH) {
      const { error: chunkErr } = await supabase
        .from("kb_chunks")
        .insert(rows.slice(i, i + BATCH));
      if (chunkErr) throw new Error(chunkErr.message);
    }

    await supabase
      .from("kb_sources")
      .update({ status: "ready", chunk_count: chunks.length, error: null })
      .eq("id", sourceId);

    return NextResponse.json({ id: sourceId, chunkCount: chunks.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed";
    await supabase
      .from("kb_sources")
      .update({ status: "failed", error: message })
      .eq("id", sourceId);
    return NextResponse.json(
      { error: `Processing failed: ${message}`, id: sourceId },
      { status: 500 }
    );
  }
}

// Store the original PDF/image in the private bucket. Failure here is non-fatal
// (we still ingest the text), so we swallow errors and return null.
async function uploadFile(
  body: KbIngestRequest,
  kind: "pdf" | "image"
): Promise<string | null> {
  if (!supabase || !body.base64) return null;
  try {
    const ext =
      kind === "pdf"
        ? "pdf"
        : (body.mimeType?.split("/")[1] ?? "png").replace("jpeg", "jpg");
    const safe = (body.fileName ?? body.title ?? kind)
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 60);
    const path = `${kind}/${safe}-${body.base64.length}.${ext}`;
    const bytes = Buffer.from(body.base64, "base64");
    const { error } = await supabase.storage
      .from("knowledge-base")
      .upload(path, bytes, {
        contentType: body.mimeType ?? "application/pdf",
        upsert: true,
      });
    return error ? null : path;
  } catch {
    return null;
  }
}
