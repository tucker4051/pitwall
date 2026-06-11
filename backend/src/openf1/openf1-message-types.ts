import type { OpenF1MvpTopic } from "./openf1-topics.js";

export type OpenF1MappedTopic =
  | "v1/drivers"
  | "v1/position"
  | "v1/location"
  | "v1/race_control"
  | "v1/stints"
  | "v1/weather"
  | "v1/car_data";

export type OpenF1MessageMetadata = {
  readonly _id?: string | number;
  readonly _key?: string;
};

export type OpenF1DriverMessage = OpenF1MessageMetadata & {
  readonly driver_number: number;
  readonly name_acronym: string;
  readonly full_name?: string;
  readonly team_name?: string;
};

export type OpenF1PositionMessage = OpenF1MessageMetadata & {
  readonly driver_number: number;
  readonly position: number;
};

export type OpenF1LocationMessage = OpenF1MessageMetadata & {
  readonly driver_number: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
};

export type OpenF1RaceControlMessage = OpenF1MessageMetadata & {
  readonly message: string;
  readonly category?: string;
  readonly flag?: string;
};

export type OpenF1WeatherMessage = OpenF1MessageMetadata & {
  readonly air_temperature: number;
  readonly track_temperature: number;
  readonly humidity: number;
  readonly rainfall: number;
  readonly wind_speed: number;
  readonly wind_direction: number;
};

export type OpenF1CarDataMessage = OpenF1MessageMetadata & {
  readonly driver_number: number;
  readonly speed: number;
  readonly throttle: number;
  readonly brake: number;
  readonly n_gear: number;
  readonly rpm: number;
};

export type OpenF1StintMessage = OpenF1MessageMetadata & {
  readonly driver_number: number;
  readonly compound: string;
  readonly stint_number: number;
  readonly tyre_age_at_start: number;
};

export function isOpenF1MappedTopic(topic: string): topic is OpenF1MappedTopic {
  return (
    topic === "v1/drivers" ||
    topic === "v1/position" ||
    topic === "v1/location" ||
    topic === "v1/race_control" ||
    topic === "v1/stints" ||
    topic === "v1/weather" ||
    topic === "v1/car_data"
  );
}

export function isOpenF1MvpTopic(topic: string): topic is OpenF1MvpTopic {
  return (
    topic === "v1/sessions" ||
    topic === "v1/drivers" ||
    topic === "v1/position" ||
    topic === "v1/intervals" ||
    topic === "v1/laps" ||
    topic === "v1/location" ||
    topic === "v1/race_control" ||
    topic === "v1/stints" ||
    topic === "v1/pit" ||
    topic === "v1/weather" ||
    topic === "v1/car_data"
  );
}
