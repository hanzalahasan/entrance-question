import type { SubjectMaster, TopicMaster } from "@/types/master";
import { masterRepo } from "@/lib/repository";

export const getStoredSubjects = () => masterRepo.getSubjects();
export const getStoredTopics = () => masterRepo.getTopics();
export const saveSubject = (s: Omit<SubjectMaster, "id">) => masterRepo.insertSubject(s);
export const saveTopic = (t: Omit<TopicMaster, "id">) => masterRepo.insertTopic(t);
export const toggleSubjectStatus = (id: number, current: SubjectMaster["status"]) =>
  masterRepo.patchSubjectStatus(id, current === "active" ? "inactive" : "active");
export const toggleTopicStatus = (id: number, current: TopicMaster["status"]) =>
  masterRepo.patchTopicStatus(id, current === "active" ? "inactive" : "active");
