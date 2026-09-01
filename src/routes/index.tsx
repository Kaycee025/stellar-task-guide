import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  Bell,
  CheckCircle2,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Sparkle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BoardColumn } from "@/components/board/BoardColumn";
import { TaskCardBody } from "@/components/board/TaskCard";
import { TaskDialog, type TaskDialogState } from "@/components/board/TaskDialog";
import { ChatPanel } from "@/components/board/ChatPanel";
import { COLUMNS, initialsOf, type Task, type TaskStatus } from "@/lib/board";
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from "@/lib/tasks";
import { displayNameOf, useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import logo from "@/assets/slothban-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Slothban — AI Kanban Board for To Do & In Progress" },
      {
        name: "description",
        content:
          "Slothban is a gorgeous drag-and-drop Kanban board with To Do and In Progress columns, saved to the cloud, plus an AI assistant that can answer questions and edit your tasks.",
      },
      { property: "og:title", content: "Slothban — AI Kanban Board" },
      {
        property: "og:description",
        content:
          "Drag-and-drop tasks across To Do and In Progress, save everything to the cloud, and ask the built-in AI assistant anything about your board.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BoardPage,
});

function BoardPage() {
  const { session, user, loading } = useAuth();
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);
  const [dialog, setDialog] = useState<TaskDialogState>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [query, setQuery] = useState("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const enabled = !!session;
  const { data: tasks = [], isLoading, refetch } = useTasks(enabled);
  const createTask = useCreateTask(user?.id);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = q
      ? tasks.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.labels.some((l) => l.toLowerCase().includes(q)),
        )
      : tasks;
    return COLUMNS.map((c) => ({
      ...c,
      tasks: visible
        .filter((t) => t.status === c.id)
        .sort((a, b) => a.position - b.position),
    }));
  }, [tasks, query]);

  const onDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const dragged = tasks.find((t) => t.id === active.id);
    if (!dragged) return;

    const overTask = tasks.find((t) => t.id === over.id);
    const targetStatus = (overTask?.status ?? (over.id as TaskStatus)) as TaskStatus;
    if (!COLUMNS.some((c) => c.id === targetStatus)) return;

    const column = tasks
      .filter((t) => t.status === targetStatus && t.id !== dragged.id)
      .sort((a, b) => a.position - b.position);

    let position: number;
    if (overTask && overTask.id !== dragged.id) {
      const index = column.findIndex((t) => t.id === overTask.id);
      const before = column[index - 1]?.position ?? column[index]!.position - 100;
      position = (before + column[index]!.position) / 2;
    } else {
      position = (column.at(-1)?.position ?? 0) + 100;
    }

    if (dragged.status === targetStatus && dragged.position === position) return;
    updateTask.mutate(
      { id: dragged.id, patch: { status: targetStatus, position } },
      { onSuccess: () => setSavedAt(new Date()) },
    );
  };

  const saveNow = async () => {
    await refetch();
    setSavedAt(new Date());
    toast.success("Board saved to your account");
  };

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading your board...
      </div>
    );
  }

  const name = displayNameOf(user);

  return (
    <div className="flex min-h-screen">
      <nav className="hidden w-16 shrink-0 flex-col items-center gap-2 border-r border-sidebar-border bg-sidebar py-5 md:flex">
        <img src={logo} alt="Slothban" width={36} height={36} className="mb-4 h-9 w-9" />
        {[LayoutGrid, Sparkle, CheckCircle2, Bell].map((Icon, i) => (
          <button
            key={i}
            type="button"
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl text-sidebar-foreground transition-colors",
              i === 0
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
            aria-label={`Panel ${i + 1}`}
          >
            <Icon className="h-5 w-5" />
          </button>
        ))}
        <div className="mt-auto flex flex-col items-center gap-2">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-sidebar-foreground hover:bg-sidebar-accent"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-sidebar-foreground hover:bg-sidebar-accent"
            aria-label="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface/80 px-5 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight">Slothban</h1>
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-accent-foreground">
              2.1
            </span>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tasks"
                className="h-9 w-48 pl-9"
              />
            </div>
            <span className="hidden items-center gap-1.5 text-xs font-medium text-muted-foreground lg:flex">
              <CheckCircle2 className="h-4 w-4 text-tag-emerald-foreground" />
              {savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : "All changes saved"}
            </span>
            <Button variant="outline" size="sm" onClick={saveNow}>
              Save board
            </Button>
            <Button size="sm" onClick={() => setChatOpen((v) => !v)}>
              <MessageCircle className="mr-1.5 h-4 w-4" />
              Ask Sloth
            </Button>
            <span className="flex h-9 w-9 items-center justify-center rounded-full brand-gradient text-xs font-bold text-primary-foreground">
              {initialsOf(name)}
            </span>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-y-auto px-5 py-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Hey {name}, here's your board</h2>
                <p className="text-sm text-muted-foreground">
                  Drag cards between columns — everything saves automatically.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDialog({ mode: "create", status: "todo" })}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                New task
              </Button>
            </div>

            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading tasks...</p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              >
                <div className="grid gap-5 md:grid-cols-2">
                  {grouped.map((column) => (
                    <BoardColumn
                      key={column.id}
                      id={column.id}
                      title={column.title}
                      tasks={column.tasks}
                      onOpen={(task) => setDialog({ mode: "edit", task })}
                      onAdd={(status) => setDialog({ mode: "create", status })}
                    />
                  ))}
                </div>
                <DragOverlay>
                  {activeTask ? <TaskCardBody task={activeTask} dragging /> : null}
                </DragOverlay>
              </DndContext>
            )}
          </main>

          <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
      </div>

      <TaskDialog
        state={dialog}
        defaultAssignee={name}
        onClose={() => setDialog(null)}
        onCreate={(draft) =>
          createTask.mutate(draft, {
            onSuccess: () => setSavedAt(new Date()),
            onError: (e) => toast.error(e.message),
          })
        }
        onUpdate={(id, patch) =>
          updateTask.mutate(
            { id, patch },
            { onSuccess: () => setSavedAt(new Date()), onError: (e) => toast.error(e.message) },
          )
        }
        onDelete={(id) =>
          deleteTask.mutate(id, {
            onSuccess: () => {
              setSavedAt(new Date());
              toast.success("Task deleted");
            },
          })
        }
      />
    </div>
  );
}
