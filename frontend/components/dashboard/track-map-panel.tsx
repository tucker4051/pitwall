"use client";

import { useEffect, useState } from "react";

import { loadCircuitInfo } from "./track-map/circuit-info-loader";
import type { CircuitInfoLoadState } from "./track-map/circuit-info-types";
import { CircuitSvgRenderer } from "./track-map/circuit-svg-renderer";
import type { DashboardDataMode, MeetingState } from "./types";

type TrackMapPanelProps = {
  readonly meeting: MeetingState;
  readonly dataMode: DashboardDataMode;
};

const INITIAL_LOAD_STATE: CircuitInfoLoadState = {
  status: "idle",
  circuitInfo: null
};

const CIRCUIT_INFO_TIMEOUT_MS = 4_000;

export function TrackMapPanel({ meeting, dataMode }: TrackMapPanelProps) {
  const [loadedCircuitInfo, setLoadedCircuitInfo] = useState<{
    readonly url: string;
    readonly loadState: CircuitInfoLoadState;
  } | null>(null);
  const [imageLoadFailedForUrl, setImageLoadFailedForUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!meeting.circuitInfoUrl) {
      return;
    }

    const circuitInfoUrl = meeting.circuitInfoUrl;
    const abortController = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      abortController.abort();
    }, CIRCUIT_INFO_TIMEOUT_MS);

    logTrackMapDiagnostic("circuitInfoUrl fetch started", {
      circuitInfoUrlPresent: true,
      circuitImagePresent: Boolean(meeting.circuitImage)
    });

    loadCircuitInfo(circuitInfoUrl, abortController.signal)
      .then((circuitInfo) => {
        clearTimeout(timeout);
        logTrackMapDiagnostic("circuitInfoUrl parsed", {
          pointCount: circuitInfo.x.length,
          cornerCount: circuitInfo.corners.length
        });
        setLoadedCircuitInfo({
          url: circuitInfoUrl,
          loadState: {
            status: "ready",
            circuitInfo
          }
        });
      })
      .catch((error: unknown) => {
        clearTimeout(timeout);

        if (error instanceof DOMException && error.name === "AbortError" && !timedOut) {
          return;
        }

        logTrackMapDiagnostic("circuitInfoUrl fetch failed", {
          reason: getCircuitInfoFailureReason(error, timedOut),
          circuitImageFallbackAvailable: Boolean(meeting.circuitImage)
        });
        setLoadedCircuitInfo({
          url: circuitInfoUrl,
          loadState: {
            status: "error",
            circuitInfo: null
          }
        });
      });

    return () => {
      clearTimeout(timeout);
      abortController.abort();
    };
  }, [meeting.circuitImage, meeting.circuitInfoUrl]);

  useEffect(() => {
    logTrackMapDiagnostic("meeting received", {
      hasMeeting: Boolean(meeting.meetingKey),
      circuitInfoUrlPresent: Boolean(meeting.circuitInfoUrl),
      circuitImagePresent: Boolean(meeting.circuitImage),
      circuitShortNamePresent: Boolean(meeting.circuitShortName)
    });
  }, [meeting.circuitImage, meeting.circuitInfoUrl, meeting.circuitShortName, meeting.meetingKey]);

  const loadState = getEffectiveLoadState(meeting.circuitInfoUrl, loadedCircuitInfo);
  const title = loadState.circuitInfo?.circuitName ?? meeting.circuitShortName ?? "Circuit";
  const subtitle = formatCircuitSubtitle(meeting);
  const sourceLabel = getSourceLabel(loadState, meeting);
  const imageFallbackAvailable = Boolean(meeting.circuitImage && imageLoadFailedForUrl !== meeting.circuitImage);
  const shouldRenderImageFallback = loadState.status !== "ready" && imageFallbackAvailable;

  useEffect(() => {
    if (shouldRenderImageFallback) {
      logTrackMapDiagnostic("circuitImage fallback used", {
        loadStatus: loadState.status
      });
    }
  }, [loadState.status, shouldRenderImageFallback]);

  return (
    <section className="relative flex h-full min-h-[280px] flex-col overflow-hidden border border-cyan-500/30 bg-[#080d14]">
      <div className="relative z-30 flex h-10 shrink-0 items-center justify-between border-b border-slate-800 bg-[#0b1119]/95 px-3">
        <div className="min-w-0">
          <h2 className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-slate-300">Live circuit · {title}</h2>
          {subtitle ? <p className="truncate font-mono text-[10px] uppercase text-slate-500">{subtitle}</p> : null}
        </div>
        <span className="shrink-0 font-mono text-[11px] uppercase text-slate-500">{sourceLabel}</span>
      </div>

      <div className="relative min-h-[240px] flex-1 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[#070c13]" />
        {loadState.status === "ready" ? (
          <div className="absolute inset-0 z-10">
            <CircuitSvgRenderer circuitInfo={loadState.circuitInfo} />
          </div>
        ) : null}
        {shouldRenderImageFallback && meeting.circuitImage ? (
          <CircuitImageFallback
            imageUrl={meeting.circuitImage}
            circuitName={title}
            onImageError={() => {
              setImageLoadFailedForUrl(meeting.circuitImage);
              logTrackMapDiagnostic("circuitImage fallback failed", {
                imageUrlPresent: true
              });
            }}
          />
        ) : null}
        {loadState.status === "loading" ? <TrackPanelState title="Loading circuit map" /> : null}
        {shouldShowWaitingState(loadState, meeting, dataMode) ? <TrackPanelState title="Waiting for meeting circuit data" /> : null}
        {shouldShowUnavailableState(loadState, meeting, dataMode, imageFallbackAvailable) ? <TrackPanelState title="Circuit map unavailable" /> : null}
      </div>
    </section>
  );
}

function getEffectiveLoadState(
  circuitInfoUrl: string | null,
  loadedCircuitInfo: {
    readonly url: string;
    readonly loadState: CircuitInfoLoadState;
  } | null
): CircuitInfoLoadState {
  if (!circuitInfoUrl) {
    return INITIAL_LOAD_STATE;
  }

  if (loadedCircuitInfo?.url === circuitInfoUrl) {
    return loadedCircuitInfo.loadState;
  }

  return {
    status: "loading",
    circuitInfo: null
  };
}

function CircuitImageFallback({
  imageUrl,
  circuitName,
  onImageError
}: {
  readonly imageUrl: string;
  readonly circuitName: string;
  readonly onImageError: () => void;
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center p-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={`${circuitName} circuit map`}
        className="block max-h-full max-w-full object-contain opacity-90"
        onError={onImageError}
      />
    </div>
  );
}

function TrackPanelState({ title }: { readonly title: string }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center">
      <div className="border border-slate-800 bg-[#0b1119]/90 px-4 py-3 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-300">{title}</p>
      </div>
    </div>
  );
}

function formatCircuitSubtitle(meeting: MeetingState): string {
  const parts = [meeting.location, meeting.countryName].filter(Boolean);
  return parts.join(" / ");
}

function getSourceLabel(loadState: CircuitInfoLoadState, meeting: MeetingState): string {
  if (loadState.status === "ready") {
    return "Circuit info";
  }

  if (meeting.circuitImage && loadState.status !== "loading") {
    return "Image fallback";
  }

  return meeting.circuitInfoUrl ? "Circuit info" : "Awaiting data";
}

function shouldShowWaitingState(
  loadState: CircuitInfoLoadState,
  meeting: MeetingState,
  dataMode: DashboardDataMode
): boolean {
  return dataMode !== "mock" && !meeting.meetingKey && loadState.status !== "loading";
}

function shouldShowUnavailableState(
  loadState: CircuitInfoLoadState,
  meeting: MeetingState,
  dataMode: DashboardDataMode,
  imageFallbackAvailable: boolean
): boolean {
  if (shouldShowWaitingState(loadState, meeting, dataMode)) {
    return false;
  }

  return loadState.status !== "ready" && loadState.status !== "loading" && !imageFallbackAvailable;
}

function getCircuitInfoFailureReason(error: unknown, timedOut: boolean): "timeout" | "cors-or-network" | "parse-or-shape" | "request" {
  if (timedOut) {
    return "timeout";
  }

  if (error instanceof TypeError) {
    return "cors-or-network";
  }

  if (error instanceof Error && error.message.toLowerCase().includes("circuit info")) {
    return "parse-or-shape";
  }

  return "request";
}

function logTrackMapDiagnostic(message: string, metadata: Record<string, boolean | number | string>): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info(`TrackMapPanel ${message}.`, metadata);
}
