import type { SubjectMaster, TopicMaster } from "@/types/master";
import {
  fetchAllSubjects,
  fetchAllTopics,
  insertSubject,
  insertTopic,
  patchSubjectStatus,
  patchTopicStatus,
} from "@/actions/master-actions";

export async function getStoredSubjects(): Promise<SubjectMaster[]> {
  return fetchAllSubjects();
}

export async function getStoredTopics(): Promise<TopicMaster[]> {
  return fetchAllTopics();
}

export async function saveSubject(
  subject: Omit<SubjectMaster, "id">
): Promise<SubjectMaster> {
  return insertSubject(subject);
}

export async function saveTopic(
  topic: Omit<TopicMaster, "id">
): Promise<TopicMaster> {
  return insertTopic(topic);
}

export async function toggleSubjectStatus(
  id: number,
  currentStatus: SubjectMaster["status"]
): Promise<void> {
  return patchSubjectStatus(id, currentStatus === "active" ? "inactive" : "active");
}

export async function toggleTopicStatus(
  id: number,
  currentStatus: TopicMaster["status"]
): Promise<void> {
  return patchTopicStatus(id, currentStatus === "active" ? "inactive" : "active");
}
