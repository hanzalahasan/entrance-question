# `POST /api/admin/tag-difficulty`

Classifies a single MCQ's difficulty as `easy` / `medium` / `hard` using a small
GPT-4o-mini call (the same rubric as `generate-explanation`, but **difficulty
only** — much cheaper for bulk tagging).

## Request body
```json
{ "question": "...", "optionA": "...", "optionB": "...", "optionC": "...",
  "optionD": "...", "answer": "C", "subjectName": "...", "topicName": "..." }
```
Only `question` is required.

## Response
```json
{ "difficulty": "easy" | "medium" | "hard" }
```
Defaults to `"medium"` if the model returns anything unexpected. Returns `503`
if `OPENAI_API_KEY` is unset, `400` if `question` is missing.

## Used by
The admin Question Management bulk action **"AI: tag difficulty"**
(`src/app/admin/questions/page.tsx`). The result is always editable afterward
(inline per-row dropdown, bulk "Set difficulty", or the edit form).
