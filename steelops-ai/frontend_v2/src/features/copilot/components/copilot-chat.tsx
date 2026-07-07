"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, MessageCircle, Send, X } from "lucide-react";

import { ActionButton } from "@/components/data-display/action-button";
import {
  answerCopilotQuestion,
  createChatMessage,
  type CopilotChatContext,
  type CopilotChatMessage,
} from "@/features/copilot/utils/copilot-chat-engine";
import { useCopilotStore } from "@/stores/copilot-store";

const SUGGESTIONS = [
  "What if I reduce DRI?",
  "Can I save one minute?",
  "Why is CPC high?",
  "Show similar heats.",
  "Why is recommendation confidence low?",
];

interface CopilotChatProps {
  context: CopilotChatContext | null;
}

export function CopilotChat({ context }: CopilotChatProps) {
  const chatOpen = useCopilotStore((s) => s.chatOpen);
  const setChatOpen = useCopilotStore((s) => s.setChatOpen);
  const [messages, setMessages] = useState<CopilotChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, chatOpen]);

  const send = (text: string) => {
    if (!text.trim() || !context) return;
    const userMessage = createChatMessage("user", text.trim());
    const reply = createChatMessage("assistant", answerCopilotQuestion(text, context));
    setMessages((prev) => [...prev, userMessage, reply]);
    setInput("");
  };

  return (
    <>
      <motion.button
        type="button"
        aria-label="Open Copilot chat"
        onClick={() => setChatOpen(true)}
        className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-primary/40 bg-primary text-primary-foreground shadow-glow-primary"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
      >
        <MessageCircle className="h-6 w-6" />
      </motion.button>

      <AnimatePresence>
        {chatOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="fixed bottom-24 right-6 z-50 flex h-[min(520px,70vh)] w-[min(420px,92vw)] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-border/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold">Copilot 4</p>
                  <p className="text-xs text-muted-foreground">Reasoning engine · no LLM</p>
                </div>
              </div>
              <button type="button" onClick={() => setChatOpen(false)} aria-label="Close chat">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">
              {messages.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Ask about recipe changes, savings, or confidence.</p>
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => send(suggestion)}
                      className="block w-full rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-left text-sm hover:border-primary/40"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      message.role === "user" ? "ml-8 bg-primary/15" : "mr-8 bg-muted/30"
                    }`}
                  >
                    {message.content}
                  </div>
                ))
              )}
            </div>

            <form
              className="flex gap-2 border-t border-border/70 p-3"
              onSubmit={(event) => {
                event.preventDefault();
                send(input);
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Copilot…"
                className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm"
                aria-label="Copilot message"
              />
              <ActionButton type="submit" size="icon" disabled={!context}>
                <Send className="h-4 w-4" />
              </ActionButton>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
