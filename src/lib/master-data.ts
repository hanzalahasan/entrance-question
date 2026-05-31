import type { SubjectMaster, TopicMaster } from "@/types/master";

export const subjectsMaster: SubjectMaster[] = [
  {
    id: 1,
    name: "Physics",
    slug: "physics",
    status: "active",
    displayOrder: 1,
  },
  {
    id: 2,
    name: "Chemistry",
    slug: "chemistry",
    status: "active",
    displayOrder: 2,
  },
  {
    id: 3,
    name: "Botany",
    slug: "botany",
    status: "active",
    displayOrder: 3,
  },
  {
    id: 4,
    name: "Zoology",
    slug: "zoology",
    status: "active",
    displayOrder: 4,
  },
  {
    id: 5,
    name: "Mathematics",
    slug: "mathematics",
    status: "active",
    displayOrder: 5,
  },
];

export const topicsMaster: TopicMaster[] = [
  { id: 1, subjectId: 1, name: "Mechanics", slug: "mechanics", status: "active", displayOrder: 1 },
  { id: 2, subjectId: 1, name: "Electricity", slug: "electricity", status: "active", displayOrder: 2 },
  { id: 3, subjectId: 2, name: "Atomic Structure", slug: "atomic-structure", status: "active", displayOrder: 1 },
  { id: 4, subjectId: 2, name: "Bonding", slug: "bonding", status: "active", displayOrder: 2 },
  { id: 5, subjectId: 3, name: "Photosynthesis", slug: "photosynthesis", status: "active", displayOrder: 1 },
  { id: 6, subjectId: 4, name: "Cell Biology", slug: "cell-biology", status: "active", displayOrder: 1 },
  { id: 7, subjectId: 5, name: "Algebra", slug: "algebra", status: "active", displayOrder: 1 },
];