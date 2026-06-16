# `check-duplicate-questions` — semantic duplicate detection

`POST /api/admin/check-duplicate-questions` — finds **rephrased duplicates**
(same meaning, different wording) that the app's exact-text check can't catch.
Used to vet AI-generated questions against the existing bank before they become
drafts.

## Why

`duplicate-question-service` only matches **word-for-word** (normalized text). A
generated question can mean the same thing as an existing one while being worded
differently — this route catches that via **embedding cosine similarity**
(`text-embedding-3-small`, the same infra as the Knowledge Base).

## Request (JSON)

| Field | Notes |
|---|---|
| `items` | `[{ index, question }]` — the candidate (generated) questions |
| `candidates` | `[{ id, question }]` — existing bank questions to compare against (the caller scopes this, e.g. to the same subject) |

## Response

`{ matches: { [index]: [{ id, question, similarity, level }] } }` — per item, up
to 3 closest existing questions above threshold, sorted by similarity.
`level`: `"near"` (≥0.92, almost certainly the same) or `"similar"` (≥0.84,
likely a rephrase). Items with no matches are omitted.

The exact (word-by-word) layer runs client-side via
`duplicate-question-service.findExactTextDuplicates` — this route only adds the
semantic layer. See `components/knowledge-base/generate-questions-panel.tsx`.
