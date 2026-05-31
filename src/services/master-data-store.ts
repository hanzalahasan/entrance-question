import type { SubjectMaster, TopicMaster } from "@/types/master";
import { subjectsMaster, topicsMaster } from "@/lib/master-data";

const SUBJECTS_KEY = "master_subjects";
const TOPICS_KEY = "master_topics";

const HAS_SUPABASE =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project");

// ── localStorage helpers ─────────────────────────────────────────────

function localGetSubjects(): SubjectMaster[] {
  if (typeof window === "undefined") return subjectsMaster;
  const raw = localStorage.getItem(SUBJECTS_KEY);
  if (!raw) {
    localStorage.setItem(SUBJECTS_KEY, JSON.stringify(subjectsMaster));
    return subjectsMaster;
  }
  return JSON.parse(raw) as SubjectMaster[];
}

function localGetTopics(): TopicMaster[] {
  if (typeof window === "undefined") return topicsMaster;
  const raw = localStorage.getItem(TOPICS_KEY);
  if (!raw) {
    localStorage.setItem(TOPICS_KEY, JSON.stringify(topicsMaster));
    return topicsMaster;
  }
  return JSON.parse(raw) as TopicMaster[];
}

function localSaveSubjects(subjects: SubjectMaster[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(SUBJECTS_KEY, JSON.stringify(subjects));
  }
}

function localSaveTopics(topics: TopicMaster[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOPICS_KEY, JSON.stringify(topics));
  }
}

// ── Public API ───────────────────────────────────────────────────────

export async function getStoredSubjects(): Promise<SubjectMaster[]> {
  if (!HAS_SUPABASE) return localGetSubjects();
  const { fetchAllSubjects } = await import("@/actions/master-actions");
  return fetchAllSubjects();
}

export async function getStoredTopics(): Promise<TopicMaster[]> {
  if (!HAS_SUPABASE) return localGetTopics();
  const { fetchAllTopics } = await import("@/actions/master-actions");
  return fetchAllTopics();
}

export async function saveSubject(
  subject: Omit<SubjectMaster, "id">
): Promise<SubjectMaster> {
  if (!HAS_SUPABASE) {
    const newSubject: SubjectMaster = { id: Date.now(), ...subject };
    localSaveSubjects([...localGetSubjects(), newSubject]);
    return newSubject;
  }
  const { insertSubject } = await import("@/actions/master-actions");
  return insertSubject(subject);
}

export async function saveTopic(
  topic: Omit<TopicMaster, "id">
): Promise<TopicMaster> {
  if (!HAS_SUPABASE) {
    const newTopic: TopicMaster = { id: Date.now(), ...topic };
    localSaveTopics([...localGetTopics(), newTopic]);
    return newTopic;
  }
  const { insertTopic } = await import("@/actions/master-actions");
  return insertTopic(topic);
}

export async function toggleSubjectStatus(
  id: number,
  currentStatus: SubjectMaster["status"]
): Promise<void> {
  const nextStatus = currentStatus === "active" ? "inactive" : "active";
  if (!HAS_SUPABASE) {
    localSaveSubjects(
      localGetSubjects().map((s) =>
        s.id === id ? { ...s, status: nextStatus } : s
      ) as SubjectMaster[]
    );
    return;
  }
  const { patchSubjectStatus } = await import("@/actions/master-actions");
  return patchSubjectStatus(id, nextStatus);
}

export async function toggleTopicStatus(
  id: number,
  currentStatus: TopicMaster["status"]
): Promise<void> {
  const nextStatus = currentStatus === "active" ? "inactive" : "active";
  if (!HAS_SUPABASE) {
    localSaveTopics(
      localGetTopics().map((t) =>
        t.id === id ? { ...t, status: nextStatus } : t
      ) as TopicMaster[]
    );
    return;
  }
  const { patchTopicStatus } = await import("@/actions/master-actions");
  return patchTopicStatus(id, nextStatus);
}
