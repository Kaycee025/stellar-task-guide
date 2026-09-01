import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/lib/board";
import { SortableTaskCard } from "./TaskCard";

export function BoardColumn({
  id,
  title,
  tasks,
  onOpen,
  onAdd,
}: {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  onOpen: (task: Task) => void;
  onAdd: (status: TaskStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { columnId: id } });

  return (
    <section className="flex w-full min-w-0 flex-col">
      <header className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              id === "todo" ? "bg-tag-violet-foreground" : "bg-tag-amber-foreground",
            )}
          />
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            {tasks.length}
          </span>
        </div>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          "scroll-slim flex min-h-[240px] flex-1 flex-col gap-3 rounded-3xl border border-transparent p-2 transition-colors",
          isOver && "border-primary/40 bg-primary-soft/60",
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onOpen={onOpen} />
          ))}
        </SortableContext>

        <button
          type="button"
          onClick={() => onAdd(id)}
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-card/60 px-4 py-3 text-sm font-semibold text-primary transition-all hover:border-primary hover:bg-primary-soft"
        >
          <Plus className="h-4 w-4" />
          Add New Task
        </button>
      </div>
    </section>
  );
}
