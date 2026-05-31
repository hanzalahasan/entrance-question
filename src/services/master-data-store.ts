import type { SubjectMaster, TopicMaster } from "@/types/master";
import { subjectsMaster, topicsMaster } from "@/lib/master-data";

const SUBJECTS_KEY = "master_subjects";
const TOPICS_KEY = "master_topics";

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

export async function getStoredSubjects(): Promise<SubjectMaster[]> {
  return localGetSubjects();
}

export async function getStoredTopics(): Promise<TopicMaster[]> {
  return localGetTopics();
}

export async function saveSubject(
  subject: Omit<SubjectMaster, "id">
): Promise<SubjectMaster> {
  const newSubject: SubjectMaster = { id: Date.now(), ...subject };
  localSaveSubjects([...localGetSubjects(), newSubject]);
  return newSubject;
}

export async function saveTopic(
  topic: Omit<TopicMaster, "id">
): Promise<TopicMaster> {
  const newTopic: TopicMaster = { id: Date.now(), ...topic };
  localSaveTopics([...localGetTopics(), newTopic]);
  return newTopic;
}

export async function toggleSubjectStatus(
  id: number,
  currentStatus: SubjectMaster["status"]
): Promise<void> {
  const next = currentStatus === "active" ? "inactive" : "active";
  localSaveSubjects(
    localGetSubjects().map((s) =>
      s.id === id ? { ...s, status: next } : s
    ) as SubjectMaster[]
  );
}

export async function toggleTopicStatus(
  id: number,
  currentStatus: TopicMaster["status"]
): Promise<void> {
  const next = currentStatus === "active" ? "inactive" : "active";
  localSaveTopics(
    localGetTopics().map((t) =>
      t.id === id ? { ...t, status: next } : t
    ) as TopicMaster[]
  );
}
