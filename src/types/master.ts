export type MasterStatus = "active" | "inactive";

export type SubjectMaster = {
  id: number;
  name: string;
  slug: string;
  status: MasterStatus;
  displayOrder: number;
};

export type TopicMaster = {
  id: number;
  subjectId: number;
  name: string;
  slug: string;
  status: MasterStatus;
  displayOrder: number;
};