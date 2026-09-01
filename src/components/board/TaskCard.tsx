import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, CheckCircle2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIORITY_TONE, formatDue, initialsOf, labelTone, type Task } from "@/lib/board";

export function TaskCardBody({ task, dragging }: { task: Task; dragging?: boolean }) {
  const due = formatDue(task.due_date);
  const progress =
    task.checklist_total > 0 ? Math.round((task.checklist_done / task.checklist_total) * 100) : 0;

  return (
    <div
      className={cn(
        "group rounded-2xl border border-border bg-card p-4 shadow-card transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift",
        dragging && "rotate-2 scale-[1.02] shadow-lift",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug text-card-foreground">{task.title}</p>
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      {task.description ? (
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {task.description}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize",
            PRIORITY_TONE[task.priority],
          )}
        >
          {task.priority}
        </span>
        {task.labels.map((label) => (
          <span
            key={label}
            className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", labelTone(label))}
          >
            {label}
          </span>
        ))}
      </div>

      {task.checklist_total > 0 ? (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full brand-gradient text-[10px] font-bold text-primary-foreground">
            {initialsOf(task.assignee)}
          </span>
          {due ? (
            <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {due}
            </span>
          ) : null}
        </div>
        {task.checklist_total > 0 ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {task.checklist_done}/{task.checklist_total}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function SortableTaskCard({ task, onOpen }: { task: Task; onOpen: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("cursor-grab active:cursor-grabbing", isDragging && "opacity-40")}
      onClick={() => onOpen(task)}
      {...attributes}
      {...listeners}
    >
      <TaskCardBody task={task} />
    </div>
  );
}
