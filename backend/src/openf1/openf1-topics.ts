export const OPENF1_MVP_TOPICS = [
  "v1/sessions",
  "v1/drivers",
  "v1/position",
  "v1/intervals",
  "v1/laps",
  "v1/location",
  "v1/race_control",
  "v1/stints",
  "v1/pit",
  "v1/weather",
  "v1/car_data"
] as const;

export type OpenF1MvpTopic = (typeof OPENF1_MVP_TOPICS)[number];
