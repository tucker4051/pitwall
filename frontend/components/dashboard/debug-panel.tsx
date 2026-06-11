import type { ConnectionStatus } from "./types";

type DebugPanelProps = {
  readonly socketUrl: string;
  readonly status: ConnectionStatus;
  readonly reconnectAttempt: number;
  readonly messages: readonly string[];
};

export function DebugPanel({ socketUrl, status, reconnectAttempt, messages }: DebugPanelProps) {
  return (
    <details className="border border-slate-800 bg-[#0b1119]">
      <summary className="cursor-pointer px-3 py-2 text-[11px] font-bold uppercase text-slate-500">
        WebSocket debug / {status}
      </summary>
      <div className="border-t border-slate-800 p-3">
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="break-all font-mono">{socketUrl}</span>
          <span className="font-mono">Reconnect {reconnectAttempt}</span>
        </div>
        <div className="grid max-h-44 gap-2 overflow-auto">
          {messages.length > 0 ? (
            messages.map((message, index) => (
              <pre key={`${index}-${message}`} className="overflow-auto border border-slate-800 bg-[#090d13] p-2 text-[11px] leading-4 text-slate-400">
                {message}
              </pre>
            ))
          ) : (
            <p className="border border-slate-800 bg-[#090d13] p-2 text-xs text-slate-500">No WebSocket messages received.</p>
          )}
        </div>
      </div>
    </details>
  );
}
