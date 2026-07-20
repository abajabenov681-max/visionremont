"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import { apiFetch, FetchError } from "@/lib/fetcher";
import { channels, REALTIME_EVENTS } from "@/lib/constants";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ChatMessageRow } from "@/types/db";

export function ChatPanel({ orderId, myUserId }: { orderId: string; myUserId: string }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["chat", orderId],
    queryFn: () => apiFetch<ChatMessageRow[]>(`/api/chat/${orderId}`),
  });

  useRealtimeChannel(channels.chat(orderId), {
    [REALTIME_EVENTS.CHAT_MESSAGE]: (payload) => {
      const message = payload.message as ChatMessageRow | undefined;
      if (!message) return;
      queryClient.setQueryData<ChatMessageRow[]>(["chat", orderId], (prev) => {
        if (!prev) return [message];
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message || sending) return;
    setSending(true);
    try {
      const row = await apiFetch<ChatMessageRow>(`/api/chat/${orderId}`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      queryClient.setQueryData<ChatMessageRow[]>(["chat", orderId], (prev) => {
        if (!prev) return [row];
        if (prev.some((m) => m.id === row.id)) return prev;
        return [...prev, row];
      });
      setText("");
    } catch (err) {
      toast.error(err instanceof FetchError ? err.message : "Ошибка сети");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base">Чат по заказу</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex max-h-80 min-h-40 flex-col gap-2 overflow-y-auto pr-1">
          {isLoading ? (
            <>
              <Skeleton className="h-10 w-2/3 rounded-xl" />
              <Skeleton className="ml-auto h-10 w-1/2 rounded-xl" />
            </>
          ) : messages && messages.length > 0 ? (
            messages.map((m) => {
              const mine = m.sender_id === myUserId;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                    mine
                      ? "ml-auto rounded-br-md bg-foreground text-background"
                      : "mr-auto rounded-bl-md bg-muted"
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.message}</p>
                  <p className={cn("mt-0.5 text-[10px]", mine ? "text-background/60" : "text-muted-foreground")}>
                    {formatTime(m.created_at)}
                  </p>
                </div>
              );
            })
          ) : (
            <p className="my-auto text-center text-sm text-muted-foreground">
              Сообщений пока нет — напишите первым
            </p>
          )}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={send} className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Сообщение…"
            className="flex-1"
          />
          <Button type="submit" size="icon" className="size-9 shrink-0 rounded-xl" disabled={sending || !text.trim()}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : <SendHorizonal className="size-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
