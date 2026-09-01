import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { X } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { askAssistant } from "@/lib/assistant.functions";
import { tasksKey } from "@/lib/tasks";
import { toast } from "sonner";
import logo from "@/assets/slothban-logo.png";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What should I focus on today?",
  "Add a task to redesign the pricing page",
  "Move everything urgent into In Progress",
];

export function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const ask = useServerFn(askAssistant);
  const loaded = useRef(false);

  useEffect(() => {
    if (!open || loaded.current) return;
    loaded.current = true;
    supabase
      .from("chat_messages")
      .select("role, content")
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data) setMessages(data as ChatMessage[]);
      });
  }, [open]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const history = messages.slice(-20);
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setBusy(true);
    try {
      const res = await ask({ data: { message: trimmed, history } });
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
      if (res.boardChanged) qc.invalidateQueries({ queryKey: tasksKey });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The assistant is unavailable.";
      toast.error(message);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `I couldn't answer that: ${message}` },
      ]);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <aside className="flex h-full w-full max-w-full flex-col border-l border-border bg-surface md:w-[380px]">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="Sloth assistant" width={32} height={32} className="h-8 w-8" />
          <div>
            <p className="text-sm font-bold leading-tight">Ask Sloth</p>
            <p className="text-[11px] text-muted-foreground">Knows your board, can edit it</p>
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close assistant">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <Conversation className="flex-1">
        <ConversationContent className="gap-4">
          {messages.length === 0 ? (
            <div className="space-y-3 py-6">
              <p className="text-sm text-muted-foreground">
                Ask about your workload, or tell me what to add and move.
              </p>
              <div className="flex flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-xl border border-border bg-card px-3 py-2 text-left text-xs font-medium transition-colors hover:border-primary/40 hover:bg-primary-soft"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((m, i) => (
            <Message from={m.role} key={i}>
              {m.role === "user" ? (
                <MessageContent className="bg-primary text-primary-foreground">
                  {m.content}
                </MessageContent>
              ) : (
                <div className="prose prose-sm max-w-none text-sm leading-relaxed text-foreground prose-p:my-1.5 prose-li:my-0.5 prose-headings:text-foreground prose-strong:text-foreground">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              )}
            </Message>
          ))}

          {busy ? <Shimmer className="text-sm">Thinking...</Shimmer> : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border p-3">
        <PromptInput
          onSubmit={(_m, e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your board..."
          />
          <PromptInputFooter className="justify-end">
            {busy ? (
              <PromptInputSubmit status="submitted" disabled />
            ) : (
              <PromptInputSubmit disabled={!input.trim()} />
            )}
          </PromptInputFooter>
        </PromptInput>
      </div>
    </aside>
  );
}
