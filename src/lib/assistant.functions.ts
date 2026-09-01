import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const InputSchema = z.object({
  message: z.string().min(1),
  history: z.array(MessageSchema).max(40).default([]),
});

const StatusEnum = z.enum(["todo", "in_progress"]);
const PriorityEnum = z.enum(["low", "medium", "high", "urgent"]);

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured yet (missing key).");

    const { supabase, userId } = context;
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .order("position", { ascending: true });

    let boardChanged = false;

    const tools = {
      create_task: tool({
        description: "Create a new task on the board.",
        inputSchema: z.object({
          title: z.string(),
          description: z.string().default(""),
          status: StatusEnum.default("todo"),
          priority: PriorityEnum.default("medium"),
          due_date: z.string().nullable().default(null),
          labels: z.array(z.string()).default([]),
          assignee: z.string().nullable().default(null),
          checklist_total: z.number().int().min(0).default(0),
        }),
        execute: async (input) => {
          const { error } = await supabase.from("tasks").insert({
            ...input,
            user_id: userId,
            position: Date.now(),
          } as never);
          if (error) return { ok: false, error: error.message };
          boardChanged = true;
          return { ok: true };
        },
      }),
      update_task: tool({
        description: "Update fields of an existing task by id, including moving it between columns.",
        inputSchema: z.object({
          id: z.string(),
          title: z.string().optional(),
          description: z.string().optional(),
          status: StatusEnum.optional(),
          priority: PriorityEnum.optional(),
          due_date: z.string().nullable().optional(),
          labels: z.array(z.string()).optional(),
          assignee: z.string().nullable().optional(),
          checklist_done: z.number().int().min(0).optional(),
          checklist_total: z.number().int().min(0).optional(),
        }),
        execute: async ({ id, ...patch }) => {
          const { error } = await supabase
            .from("tasks")
            .update(patch as never)
            .eq("id", id);
          if (error) return { ok: false, error: error.message };
          boardChanged = true;
          return { ok: true };
        },
      }),
      delete_task: tool({
        description: "Delete a task by id.",
        inputSchema: z.object({ id: z.string() }),
        execute: async ({ id }) => {
          const { error } = await supabase.from("tasks").delete().eq("id", id);
          if (error) return { ok: false, error: error.message };
          boardChanged = true;
          return { ok: true };
        },
      }),
    };

    const boardSnapshot = JSON.stringify(tasks ?? []);

    const result = await generateText({
      model: gateway("google/gemini-3.7-flash"),
      stopWhen: stepCountIs(20),
      tools,
      system: [
        "You are Sloth, the assistant inside a Kanban board app with two columns: To Do (todo) and In Progress (in_progress).",
        "You can read the board and create, update, move, or delete tasks using the provided tools.",
        "Be concise, friendly and use markdown. Confirm changes you made in one short sentence.",
        "Dates use YYYY-MM-DD. Today is " + new Date().toISOString().slice(0, 10) + ".",
        "Current board JSON:",
        boardSnapshot,
      ].join("\n"),
      messages: [
        ...data.history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: data.message },
      ],
    });

    const reply = result.text?.trim() || "Done.";

    await supabase.from("chat_messages").insert([
      { user_id: userId, role: "user", content: data.message },
      { user_id: userId, role: "assistant", content: reply },
    ] as never);

    return { reply, boardChanged };
  });
