"use server";

import type { SubjectMaster, TopicMaster } from "@/types/master";
import { subjectsMaster, topicsMaster } from "@/lib/master-data";

const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co";

function mapRowToSubject(row: Record<string, unknown>): SubjectMaster {
  return {
    id: row.id as number,
    name: row.name as string,
    slug: row.slug as string,
    status: row.status as SubjectMaster["status"],
    displayOrder: row.display_order as number,
  };
}

function mapRowToTopic(row: Record<string, unknown>): TopicMaster {
  return {
    id: row.id as number,
    subjectId: row.subject_id as number,
    name: row.name as string,
    slug: row.slug as string,
    status: row.status as TopicMaster["status"],
    displayOrder: row.display_order as number,
  };
}

export async function fetchAllSubjects(): Promise<SubjectMaster[]> {
  if (!isSupabaseConfigured) return subjectsMaster;

  const { createServerClient } = await import("@/lib/supabase/server");
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .order("display_order");

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRowToSubject);
}

export async function fetchAllTopics(): Promise<TopicMaster[]> {
  if (!isSupabaseConfigured) return topicsMaster;

  const { createServerClient } = await import("@/lib/supabase/server");
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .order("display_order");

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRowToTopic);
}

export async function insertSubject(
  subject: Omit<SubjectMaster, "id">
): Promise<SubjectMaster> {
  if (!isSupabaseConfigured) {
    return { id: Date.now(), ...subject };
  }

  const { createServerClient } = await import("@/lib/supabase/server");
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("subjects")
    .insert({
      name: subject.name,
      slug: subject.slug,
      status: subject.status,
      display_order: subject.displayOrder,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapRowToSubject(data);
}

export async function insertTopic(
  topic: Omit<TopicMaster, "id">
): Promise<TopicMaster> {
  if (!isSupabaseConfigured) {
    return { id: Date.now(), ...topic };
  }

  const { createServerClient } = await import("@/lib/supabase/server");
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("topics")
    .insert({
      subject_id: topic.subjectId,
      name: topic.name,
      slug: topic.slug,
      status: topic.status,
      display_order: topic.displayOrder,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapRowToTopic(data);
}

export async function patchSubjectStatus(
  id: number,
  status: SubjectMaster["status"]
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { createServerClient } = await import("@/lib/supabase/server");
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("subjects")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function patchTopicStatus(
  id: number,
  status: TopicMaster["status"]
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { createServerClient } = await import("@/lib/supabase/server");
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("topics")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);
}
