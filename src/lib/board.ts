export type TaskStatus = "todo" | "in_progress";
export type Priority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  labels: string[];
  assignee: string | null;
  checklist_done: number;
  checklist_total: number;
  position: number;
  created_at: string;
  updated_at: string;
}

export const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
];

export const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];

const TAG_TONES = [
  "bg-tag-violet text-tag-violet-foreground",
  "bg-tag-amber text-tag-amber-foreground",
  "bg-tag-emerald text-tag-emerald-foreground",
  "bg-tag-sky text-tag-sky-foreground",
  "bg-tag-rose text-tag-rose-foreground",
  "bg-tag-slate text-tag-slate-foreground",
];

export function labelTone(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return TAG_TONES[hash % TAG_TONES.length];
}

export const PRIORITY_TONE: Record<Priority, string> = {
  low: "bg-tag-slate text-tag-slate-foreground",
  medium: "bg-tag-sky text-tag-sky-foreground",
  high: "bg-tag-amber text-tag-amber-foreground",
  urgent: "bg-tag-rose text-tag-rose-foreground",
};

export function initialsOf(name: string | null | undefined) {
  if (!name) return "??";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatDue(date: string | null) {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
