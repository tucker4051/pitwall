"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { DebugPanel } from "./debug-panel";
import { DriverFocusPanel } from "./driver-focus-panel";
import {
  applyQualifyingFreeze,
  buildTimingTowerRowsForDashboard,
  INITIAL_QUALIFYING_FREEZE_STATE,
  reduceQualifyingFreezeState,
  type QualifyingFreezeState
} from "./qualifying-elimination-freeze";
import { RaceContextPanel } from "./race-context-panel";
import { TimingTowerPanel } from "./timing-tower-panel";
import { TopStatusBar } from "./top-status-bar";
import { TrackMapPanel } from "./track-map-panel";
import type {
  ConnectionStatus,
  DashboardMessage,
  DashboardState,
  TelemetrySnapshot,
  TimingDriver,
  TyreStint
} from "./types";

const MAX_VISIBLE_DEBUG_MESSAGES = 5;
const RECONNECT_DELAY_MS = 2_000;

const INITIAL_DASHBOARD_STATE: DashboardState = {
  connection: {
    status: "disconnected",
    dataMode: "unknown",
    sessionName: null,
    sessionType: null,
    lastUpdate: null,
    lastMessageReceivedAt: null,
    isStale: false,
    staleThresholdMs: 0
  },
  meeting: {
    meetingKey: null,
    name: null,
    officialName: null,
    circuitKey: null,
    circuitShortName: null,
    circuitImage: null,
    circuitInfoUrl: null,
    circuitType: null,
    countryCode: null,
    countryName: null,
    countryFlag: null,
    location: null,
    dateStart: null,
    dateEnd: null,
    gmtOffset: null,
    year: null
  },
  session: {
    meetingKey: null,
    sessionKey: null,
    name: null,
    type: null,
    dateStart: null,
    dateEnd: null,
    driverMetadataStatus: "idle",
    qualifyingPhase: null
  },
  timing: {
    lap: null,
    drivers: []
  },
  drivers: [],
  raceControlMessages: [],
  trackPositions: [],
  weather: null,
  telemetry: [],
  stints: []
};

type DashboardViewState = {
  readonly dashboard: DashboardState;
  readonly qualifyingFreeze: QualifyingFreezeState;
};

const INITIAL_DASHBOARD_VIEW_STATE: DashboardViewState = {
  dashboard: INITIAL_DASHBOARD_STATE,
  qualifyingFreeze: INITIAL_QUALIFYING_FREEZE_STATE
};

export function DashboardShell() {
  const webSocketUrl = useMemo(() => process.env.NEXT_PUBLIC_BACKEND_WS_URL ?? "ws://localhost:3001/ws", []);
  const [viewState, setViewState] = useState<DashboardViewState>(INITIAL_DASHBOARD_VIEW_STATE);
  const [socketStatus, setSocketStatus] = useState<ConnectionStatus>("connecting");
  const [selectedDriverKey, setSelectedDriverKey] = useState<string | null>(null);
  const [debugMessages, setDebugMessages] = useState<readonly string[]>([]);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [now, setNow] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);
  const dashboard = viewState.dashboard;

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1_000);

    return () => {
      clearInterval(interval);
    };
  }, []);

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
      setSocketStatus("connecting");

      socket.addEventListener("open", () => {
        clearReconnectTimer();
        setSocketStatus("connected");
      });

      socket.addEventListener("message", (event) => {
        setDebugMessages((messages) => [formatMessage(event.data), ...messages].slice(0, MAX_VISIBLE_DEBUG_MESSAGES));

        const message = parseDashboardMessage(event.data);

        if (!message) {
          return;
        }

        setViewState((currentViewState) => reduceDashboardViewState(currentViewState, message));
      });

      socket.addEventListener("close", () => {
        socketRef.current = null;
        setSocketStatus("disconnected");

        if (!shouldReconnectRef.current) {
          return;
        }

        clearReconnectTimer();
        reconnectTimerRef.current = setTimeout(() => {
          setReconnectAttempt((attempt) => attempt + 1);
          connect();
        }, RECONNECT_DELAY_MS);
      });

      socket.addEventListener("error", () => {
        setSocketStatus("error");
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

  const timingTowerRowsResult = buildTimingTowerRowsForDashboard(dashboard);
  const qualifyingElimination = applyQualifyingFreeze(timingTowerRowsResult, viewState.qualifyingFreeze, dashboard.session);
  const displayTimingTowerRowsResult = qualifyingElimination.rowsResult;
  const visibleDrivers = displayTimingTowerRowsResult.rows;
  const selectedTimingDriver =
    selectedDriverKey && visibleDrivers.some((driver) => driver.rowKey === selectedDriverKey)
      ? (visibleDrivers.find((driver) => driver.rowKey === selectedDriverKey) ?? null)
      : null;
  const selectedStint = selectedTimingDriver ? findStint(dashboard.stints, selectedTimingDriver) : null;
  const selectedTelemetry = selectedTimingDriver ? findTelemetry(dashboard.telemetry, selectedTimingDriver) : null;

  return (
    <main className="h-screen overflow-hidden bg-[#05070b] text-slate-100">
      <div className="flex h-full flex-col">
        <TopStatusBar dashboard={dashboard} socketStatus={socketStatus} now={now} />

        <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(520px,1fr)_360px] gap-3 p-3">
          <div className="min-h-0">
            <TimingTowerPanel
              rowsResult={displayTimingTowerRowsResult}
              session={dashboard.session}
              eliminatedRowKeys={qualifyingElimination.eliminatedRowKeys}
              selectedDriverKey={selectedTimingDriver?.rowKey ?? null}
              onSelectDriver={(driver) => setSelectedDriverKey(driver.rowKey)}
              onClearSelectedDriver={() => setSelectedDriverKey(null)}
            />
          </div>

          <div className="grid min-h-0 grid-rows-[minmax(360px,1fr)_minmax(250px,32vh)] gap-3">
            <TrackMapPanel
              meeting={dashboard.meeting}
              dataMode={dashboard.connection.dataMode}
              positions={dashboard.trackPositions}
              drivers={visibleDrivers}
              selectedDriverNumber={selectedTimingDriver?.driverNumber}
            />
            <RaceContextPanel
              raceControlMessages={dashboard.raceControlMessages}
              weather={dashboard.weather}
              meeting={dashboard.meeting}
              session={dashboard.session}
              lap={dashboard.timing.lap}
              driverCount={visibleDrivers.length}
              dataMode={dashboard.connection.dataMode}
              now={now}
            />
          </div>

          <div className="min-h-0">
            <DriverFocusPanel
              driver={selectedTimingDriver}
              timingColumnHeader={timingTowerRowsResult.timingColumnHeader}
              stint={selectedStint}
              telemetry={selectedTelemetry}
            />
          </div>

          <div className="fixed bottom-3 right-3 z-30 w-[420px] max-w-[calc(100vw-24px)]">
            <DebugPanel
              socketUrl={webSocketUrl}
              status={socketStatus}
              reconnectAttempt={reconnectAttempt}
              messages={debugMessages}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function reduceDashboardMessage(dashboard: DashboardState, message: DashboardMessage): DashboardState {
  switch (message.type) {
    case "connection:update":
      return {
        ...dashboard,
        connection: message.payload
      };
    case "meeting:update":
      return {
        ...dashboard,
        meeting: message.payload
      };
    case "session:update":
      if (
        dashboard.session.sessionKey !== null &&
        message.payload.sessionKey !== null &&
        dashboard.session.sessionKey !== message.payload.sessionKey
      ) {
        return {
          ...dashboard,
          session: message.payload,
          timing: {
            lap: null,
            drivers: []
          },
          drivers: [],
          raceControlMessages: [],
          trackPositions: [],
          weather: null,
          telemetry: [],
          stints: []
        };
      }

      return {
        ...dashboard,
        session: message.payload
      };
    case "drivers:update":
      return {
        ...dashboard,
        drivers: message.payload.drivers
      };
    case "timing:update":
      return {
        ...dashboard,
        timing: message.payload
      };
    case "race-control:update":
      return {
        ...dashboard,
        session: {
          ...dashboard.session,
          qualifyingPhase: message.payload.qualifyingPhase
        },
        raceControlMessages: message.payload.messages
      };
    case "track:update":
      return {
        ...dashboard,
        trackPositions: message.payload.positions
      };
    case "weather:update":
      return {
        ...dashboard,
        weather: message.payload
      };
    case "telemetry:update":
      return {
        ...dashboard,
        telemetry: message.payload.snapshots
      };
    case "stints:update":
      return {
        ...dashboard,
        stints: message.payload.stints
      };
  }
}

function reduceDashboardViewState(viewState: DashboardViewState, message: DashboardMessage): DashboardViewState {
  const nextDashboard = reduceDashboardMessage(viewState.dashboard, message);

  return {
    dashboard: nextDashboard,
    qualifyingFreeze: reduceQualifyingFreezeState({
      freezeState: viewState.qualifyingFreeze,
      currentDashboard: viewState.dashboard,
      nextDashboard
    })
  };
}

function parseDashboardMessage(data: unknown): DashboardMessage | null {
  if (typeof data !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(data) as { readonly type?: unknown };

    if (typeof parsed.type !== "string") {
      return null;
    }

    return parsed as DashboardMessage;
  } catch {
    return null;
  }
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

function findStint(stints: readonly TyreStint[], driver: TimingDriver): TyreStint | null {
  if (driver.driverNumber) {
    return chooseLatestStint(stints.filter((stint) => stint.driverNumber === driver.driverNumber));
  }

  return chooseLatestStint([stints[driver.position - 1]].filter((stint): stint is TyreStint => Boolean(stint)));
}

function chooseLatestStint(stints: readonly TyreStint[]): TyreStint | null {
  return (
    [...stints].sort((left, right) => {
      if (left.stintNumber !== right.stintNumber) {
        return right.stintNumber - left.stintNumber;
      }

      return getStintLapSortValue(right) - getStintLapSortValue(left);
    })[0] ?? null
  );
}

function getStintLapSortValue(stint: TyreStint): number {
  return stint.lapEnd ?? stint.lapStart ?? 0;
}

function findTelemetry(telemetry: readonly TelemetrySnapshot[], driver: TimingDriver): TelemetrySnapshot | null {
  if (driver.driverNumber) {
    return telemetry.find((snapshot) => snapshot.driverNumber === driver.driverNumber) ?? null;
  }

  return telemetry[driver.position - 1] ?? null;
}
