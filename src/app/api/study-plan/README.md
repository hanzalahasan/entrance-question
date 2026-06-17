# `study-plan` — AI study plan from a user's performance

`POST /api/study-plan` — given a user's aggregated accuracy + weak/strong topics,
returns an AI-written, granular study plan (per weak topic: what to revise, how to
practice, a common trap). User-facing (not under `api/admin`). Receives only
**aggregated numbers**, no PII.

## Request (JSON)
`{ accuracy, attempted, weaknesses: TopicStat[], strengths: TopicStat[] }`
where `TopicStat = { subjectName, topicName, accuracy, attempted, correct }`.

## Response
`{ summary: string, items: [{ subjectName, topicName, advice }] }`

Uses `gpt-4o-mini`. The performance numbers come from
`services/performance-service.ts` (mocks + practice). Triggered by the dashboard's
**Get AI study plan** button in `components/dashboard/performance-insights.tsx`.
Requires `OPENAI_API_KEY`.
