"use client";

import {
  useEffect,
  useId,
  useRef,
} from "react";

import { supabase } from "@/lib/supabase";

type UseRealtimeProps = {
  channelName: string;
  table: string;
  onChange: () => void;
  enabled?: boolean;
};

export function useRealtime({
  channelName,
  table,
  onChange,
  enabled = true,
}: UseRealtimeProps) {
  const onChangeRef = useRef(onChange);
  const instanceId = useId();

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const scopedChannelName =
      `${channelName}:${instanceId}`;

    const channel =
      supabase
      .channel(scopedChannelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        () => {
          onChangeRef.current();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    channelName,
    table,
    enabled,
    instanceId,
  ]);
}
