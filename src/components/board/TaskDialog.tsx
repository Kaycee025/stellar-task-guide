import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COLUMNS, PRIORITIES, type Priority, type Task, type TaskStatus } from "@/lib/board";
import type { TaskDraft } from "@/lib/tasks";

export type TaskDialogState =
  | { mode: "create"; status: TaskStatus }
  | { mode: "edit"; task: Task }
  | null;

const emptyDraft = (status: TaskStatus, assignee: string): TaskDraft => ({
  title: "",
  description: "",
  status,
  priority: "medium",
  due_date: null,
  labels: [],
  assignee,
  checklist_done: 0,
  checklist_total: 0,
});

export function TaskDialog({
  state,
  defaultAssignee,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: {
  state: TaskDialogState;
  defaultAssignee: string;
  onClose: () => void;
  onCreate: (draft: TaskDraft) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft("todo", defaultAssignee));
  const [labelText, setLabelText] = useState("");

  useEffect(() => {
    if (!state) return;
    if (state.mode === "create") {
      setDraft(emptyDraft(state.status, defaultAssignee));
      setLabelText("");
    } else {
      const t = state.task;
      setDraft({
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        due_date: t.due_date,
        labels: t.labels,
        assignee: t.assignee,
        checklist_done: t.checklist_done,
        checklist_total: t.checklist_total,
      });
      setLabelText(t.labels.join(", "));
    }
  }, [state, defaultAssignee]);

  const submit = () => {
    if (!state || !draft.title.trim()) return;
    const labels = labelText
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);
    const payload = { ...draft, labels };
    if (state.mode === "create") onCreate(payload);
    else onUpdate(state.task.id, payload as Partial<Task>);
    onClose();
  };

  return (
    <Dialog open={!!state} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{state?.mode === "edit" ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={draft.title}
              autoFocus
              placeholder="Optimize landing page"
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={draft.description}
              placeholder="What needs to happen?"
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Column</Label>
              <Select
                value={draft.status}
                onValueChange={(v) => setDraft({ ...draft, status: v as TaskStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLUMNS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Priority</Label>
              <Select
                value={draft.priority}
                onValueChange={(v) => setDraft({ ...draft, priority: v as Priority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="due">Due date</Label>
              <Input
                id="due"
                type="date"
                value={draft.due_date ?? ""}
                onChange={(e) => setDraft({ ...draft, due_date: e.target.value || null })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="assignee">Assignee</Label>
              <Input
                id="assignee"
                value={draft.assignee ?? ""}
                placeholder="Kay Cee"
                onChange={(e) => setDraft({ ...draft, assignee: e.target.value || null })}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="labels">Labels (comma separated)</Label>
            <Input
              id="labels"
              value={labelText}
              placeholder="Marketing, Website"
              onChange={(e) => setLabelText(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="done">Checklist done</Label>
              <Input
                id="done"
                type="number"
                min={0}
                value={draft.checklist_done}
                onChange={(e) =>
                  setDraft({ ...draft, checklist_done: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="total">Checklist total</Label>
              <Input
                id="total"
                type="number"
                min={0}
                value={draft.checklist_total}
                onChange={(e) =>
                  setDraft({ ...draft, checklist_total: Number(e.target.value) || 0 })
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {state?.mode === "edit" ? (
            <Button
              variant="ghost"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => {
                onDelete(state.task.id);
                onClose();
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!draft.title.trim()}>
              {state?.mode === "edit" ? "Save changes" : "Create task"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
