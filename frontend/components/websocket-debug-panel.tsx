"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

const MAX_VISIBLE_MESSAGES = 6;
const RECONNECT_DELAY_MS = 2_000;

export function WebSocketDebugPanel() {
  const webSocketUrl = useMemo(() => process.env.NEXT_PUBLIC_BACKEND_WS_URL ?? "ws://localhost:3001/ws", []);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [messages, setMessages] = useState<readonly string[]>([]);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);

  useEffect(() => {
    shouldReconnectRef.current = true;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const connect = () => {
      if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
        return;
      }

      const socket = new WebSocket(webSocketUrl);
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        clearReconnectTimer();
        setStatus("connected");
      });

      socket.addEventListener("message", (event) => {
        setMessages((currentMessages) => [formatMessage(event.data), ...currentMessages].slice(0, MAX_VISIBLE_MESSAGES));
      });

      socket.addEventListener("close", () => {
        socketRef.current = null;
        setStatus("disconnected");

        if (!shouldReconnectRef.current) {
          return;
        }

        clearReconnectTimer();
        reconnectTimerRef.current = setTimeout(() => {
          setReconnectAttempt((currentAttempt) => currentAttempt + 1);
          setStatus("connecting");
          connect();
        }, RECONNECT_DELAY_MS);
      });

      socket.addEventListener("error", () => {
        setStatus("error");
      });
    };

    connect();

    return () => {
      shouldReconnectRef.current = false;
      clearReconnectTimer();
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [webSocketUrl]);

  return (
    <section className="rounded border border-slate-800 bg-slate-950 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-normal text-slate-400">WebSocket proof</h2>
          <p className="mt-1 break-all font-mono text-xs text-slate-500">{webSocketUrl}</p>
        </div>
        <span className={getStatusClassName(status)}>{status}</span>
      </div>

      {status === "disconnected" || status === "connecting" ? (
        <p className="mt-3 text-xs text-slate-400">
          {status === "disconnected" ? "Disconnected. Reconnect scheduled." : getConnectingLabel(reconnectAttempt)}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {messages.length > 0 ? (
          messages.map((message, index) => (
            <pre key={`${index}-${message}`} className="max-h-48 overflow-auto rounded bg-slate-900 p-3 text-xs leading-5 text-slate-300">
              {message}
            </pre>
          ))
        ) : (
          <p className="rounded bg-slate-900 p-3 text-xs text-slate-400">No message received yet.</p>
        )}
      </div>
    </section>
  );
}

function formatMessage(data: unknown): string {
  if (typeof data !== "string") {
    return String(data);
  }

  try {
    return JSON.stringify(JSON.parse(data), null, 2);
  } catch {
    return data;
  }
}

function getConnectingLabel(reconnectAttempt: number): string {
  if (reconnectAttempt === 0) {
    return "Connecting.";
  }

  return `Reconnecting. Attempt ${reconnectAttempt}.`;
}

function getStatusClassName(status: ConnectionStatus): string {
  const baseClassName = "rounded border px-3 py-1 text-xs font-medium uppercase tracking-normal";

  switch (status) {
    case "connected":
      return `${baseClassName} border-emerald-500/50 bg-emerald-500/10 text-emerald-300`;
    case "connecting":
      return `${baseClassName} border-sky-500/50 bg-sky-500/10 text-sky-300`;
    case "error":
      return `${baseClassName} border-red-500/50 bg-red-500/10 text-red-300`;
    case "disconnected":
      return `${baseClassName} border-slate-600 bg-slate-900 text-slate-300`;
  }
}
