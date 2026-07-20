"use client";

import { useEffect, useRef } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

type Handlers = Record<string, (payload: Record<string, unknown>) => void>;

/**
 * Subscribes to broadcast events on a Supabase Realtime channel.
 * `handlers` maps event name -> callback. Pass `enabled: false` to pause.
 */
export function useRealtimeChannel(topic: string | null, handlers: Handlers, enabled = true) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!topic || !enabled) return;
    const supabase = getBrowserClient();
    let channel = supabase.channel(topic);
    for (const event of Object.keys(handlersRef.current)) {
      channel = channel.on("broadcast", { event }, (msg) => {
        handlersRef.current[event]?.(msg.payload as Record<string, unknown>);
      });
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // handlers intentionally excluded: latest versions are read via ref
  }, [topic, enabled]);
}
