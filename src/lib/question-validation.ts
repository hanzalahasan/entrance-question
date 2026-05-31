import type { Question } from "@/types/question";

export function validateQuestion(q: Question): string | null {
  if (!q.question.trim()) return "Question text is required.";
  if (!q.subjectId) return "Please select a subject.";
  if (!q.topicId) return "Please select a topic.";
  if (!q.answer) return "Please select the correct answer option.";

  for (const option of q.options) {
    if (option.type === "image" && !option.imageUrl)
      return `Option ${option.key} requires an image.`;
    if (option.type === "text_image" && (!option.value?.trim() || !option.imageUrl))
      return `Option ${option.key} requires both text and an image.`;
    if (option.type === "text" && !option.value?.trim())
      return `Option ${option.key} text is required.`;
  }

  return null;
}
