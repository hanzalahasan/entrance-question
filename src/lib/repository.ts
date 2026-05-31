/**
 * Repository interfaces — swap the implementation here to change the backend.
 * Current: localStorage  |  Next: Supabase (set NEXT_PUBLIC_SUPABASE_URL in Vercel)
 */

import type { Question } from "@/types/question";
import type { SubjectMaster, TopicMaster } from "@/types/master";
import { sampleQuestions } from "@/lib/sample-questions";
import { subjectsMaster, topicsMaster } from "@/lib/master-data";

// ── Interfaces ───────────────────────────────────────────────────────

export interface QuestionRepo {
  getAll(): Promise<Question[]>;
  getById(id: number): Promise<Question | null>;
  insert(q: Question): Promise<Question>;
  update(q: Question): Promise<void>;
  patchStatus(id: number, status: Question["status"]): Promise<void>;
  bulkPatchStatus(ids: number[], status: Question["status"]): Promise<void>;
  replaceAll(questions: Question[]): Promise<void>;
}

export interface MasterRepo {
  getSubjects(): Promise<SubjectMaster[]>;
  getTopics(): Promise<TopicMaster[]>;
  insertSubject(s: Omit<SubjectMaster, "id">): Promise<SubjectMaster>;
  insertTopic(t: Omit<TopicMaster, "id">): Promise<TopicMaster>;
  patchSubjectStatus(id: number, status: SubjectMaster["status"]): Promise<void>;
  patchTopicStatus(id: number, status: TopicMaster["status"]): Promise<void>;
}

// ── localStorage helpers ─────────────────────────────────────────────

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

const QUESTIONS_KEY = "admin_questions";
const SUBJECTS_KEY = "master_subjects";
const TOPICS_KEY = "master_topics";

// ── localStorage implementation ──────────────────────────────────────

const localQuestionRepo: QuestionRepo = {
  async getAll() {
    return read<Question[]>(QUESTIONS_KEY, sampleQuestions);
  },
  async getById(id) {
    const all = read<Question[]>(QUESTIONS_KEY, sampleQuestions);
    return all.find((q) => q.id === id) ?? null;
  },
  async insert(q) {
    const all = read<Question[]>(QUESTIONS_KEY, sampleQuestions);
    write(QUESTIONS_KEY, [q, ...all]);
    return q;
  },
  async update(q) {
    const all = read<Question[]>(QUESTIONS_KEY, sampleQuestions);
    write(QUESTIONS_KEY, all.map((item) => (item.id === q.id ? q : item)));
  },
  async patchStatus(id, status) {
    const all = read<Question[]>(QUESTIONS_KEY, sampleQuestions);
    write(
      QUESTIONS_KEY,
      all.map((q) =>
        q.id === id ? { ...q, status, updatedAt: new Date().toISOString() } : q
      )
    );
  },
  async bulkPatchStatus(ids, status) {
    const all = read<Question[]>(QUESTIONS_KEY, sampleQuestions);
    write(
      QUESTIONS_KEY,
      all.map((q) =>
        ids.includes(q.id) ? { ...q, status, updatedAt: new Date().toISOString() } : q
      )
    );
  },
  async replaceAll(questions) {
    write(QUESTIONS_KEY, questions);
  },
};

const localMasterRepo: MasterRepo = {
  async getSubjects() {
    return read<SubjectMaster[]>(SUBJECTS_KEY, subjectsMaster);
  },
  async getTopics() {
    return read<TopicMaster[]>(TOPICS_KEY, topicsMaster);
  },
  async insertSubject(s) {
    const all = read<SubjectMaster[]>(SUBJECTS_KEY, subjectsMaster);
    const created: SubjectMaster = { id: Date.now(), ...s };
    write(SUBJECTS_KEY, [...all, created]);
    return created;
  },
  async insertTopic(t) {
    const all = read<TopicMaster[]>(TOPICS_KEY, topicsMaster);
    const created: TopicMaster = { id: Date.now(), ...t };
    write(TOPICS_KEY, [...all, created]);
    return created;
  },
  async patchSubjectStatus(id, status) {
    const all = read<SubjectMaster[]>(SUBJECTS_KEY, subjectsMaster);
    write(SUBJECTS_KEY, all.map((s) => (s.id === id ? { ...s, status } : s)));
  },
  async patchTopicStatus(id, status) {
    const all = read<TopicMaster[]>(TOPICS_KEY, topicsMaster);
    write(TOPICS_KEY, all.map((t) => (t.id === id ? { ...t, status } : t)));
  },
};

// ── Active repositories (swap here when adding Supabase) ─────────────

export const questionRepo: QuestionRepo = localQuestionRepo;
export const masterRepo: MasterRepo = localMasterRepo;
