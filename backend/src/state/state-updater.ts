import type { MockSourceMessage } from "../mock/mock-messages.js";
import type { CurrentRaceState, DashboardMessage, DriverState, RaceControlMessageState } from "./types.js";

const MAX_RACE_CONTROL_MESSAGES = 10;

export function applyMockMessageToState(state: CurrentRaceState, message: MockSourceMessage): CurrentRaceState {
  switch (message.type) {
    case "mock:connection":
      return {
        ...state,
        connection: {
          status: "connected",
          dataMode: "mock",
          lastUpdate: message.recordedAt
        },
        session: {
          name: message.payload.sessionName,
          type: message.payload.sessionType
        }
      };

    case "mock:timing": {
      const drivers = new Map<string, DriverState>();

      for (const driver of message.payload.drivers) {
        drivers.set(driver.abbreviation, {
          abbreviation: driver.abbreviation,
          position: driver.position
        });
      }

      return {
        ...state,
        connection: {
          ...state.connection,
          lastUpdate: message.recordedAt
        },
        drivers,
        timing: {
          lap: message.payload.lap,
          drivers: message.payload.drivers
        }
      };
    }

    case "mock:race-control": {
      const nextMessages: readonly RaceControlMessageState[] = [
        ...message.payload.messages.map((raceControlMessage) => ({
          ...raceControlMessage,
          receivedAt: message.recordedAt
        })),
        ...state.raceControlMessages
      ].slice(0, MAX_RACE_CONTROL_MESSAGES);

      return {
        ...state,
        connection: {
          ...state.connection,
          lastUpdate: message.recordedAt
        },
        raceControlMessages: nextMessages
      };
    }
  }
}

export function createDashboardMessageFromState(
  state: CurrentRaceState,
  sourceType: MockSourceMessage["type"],
  sentAt: string
): DashboardMessage {
  switch (sourceType) {
    case "mock:connection":
      return {
        type: "connection:update",
        sentAt,
        payload: {
          status: state.connection.status,
          dataMode: state.connection.dataMode,
          sessionName: state.session.name,
          sessionType: state.session.type,
          lastUpdate: state.connection.lastUpdate
        }
      };

    case "mock:timing":
      return {
        type: "timing:update",
        sentAt,
        payload: state.timing
      };

    case "mock:race-control":
      return {
        type: "race-control:update",
        sentAt,
        payload: {
          messages: state.raceControlMessages
        }
      };
  }
}
