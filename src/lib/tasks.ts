import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Task, TaskStatus } from "./board";

export const tasksKey = ["tasks"] as const;

export function useTasks(enabled: boolean) {
  return useQuery({
    queryKey: tasksKey,
    enabled,
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Task[];
    },
  });
}

export type TaskDraft = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: string;
  due_date: string | null;
  labels: string[];
  assignee: string | null;
  checklist_done: number;
  checklist_total: number;
};

export function useCreateTask(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: TaskDraft & { position?: number }) => {
      if (!userId) throw new Error("Not signed in");
      const { error } = await supabase.from("tasks").insert({
        ...draft,
        position: draft.position ?? Date.now(),
        user_id: userId,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: tasksKey }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Task> }) => {
      const { error } = await supabase
        .from("tasks")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: tasksKey }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: tasksKey }),
  });
}
