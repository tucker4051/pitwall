export const OPENF1_FIXTURE_RECEIVED_AT = new Date("2026-06-11T12:00:00.000Z");

export const OPENF1_FIXTURE_MESSAGES = [
  {
    topic: "v1/sessions",
    payload: {
      _id: 10_000,
      _key: "session-latest",
      session_name: "Mock Grand Prix",
      session_type: "Race"
    }
  },
  {
    topic: "v1/drivers",
    payload: {
      _id: 10_001,
      _key: "driver-1",
      driver_number: 1,
      name_acronym: "VER",
      full_name: "Max Verstappen",
      team_name: "Red Bull Racing"
    }
  },
  {
    topic: "v1/drivers",
    payload: {
      _id: 10_002,
      _key: "driver-4",
      driver_number: 4,
      name_acronym: "NOR",
      full_name: "Lando Norris",
      team_name: "McLaren"
    }
  },
  {
    topic: "v1/position",
    payload: {
      _id: 10_003,
      _key: "position-1",
      driver_number: 1,
      position: 1
    }
  },
  {
    topic: "v1/position",
    payload: {
      _id: 10_004,
      _key: "position-4",
      driver_number: 4,
      position: 2
    }
  },
  {
    topic: "v1/laps",
    payload: {
      _id: 10_004_1,
      _key: "lap-1-14",
      driver_number: 1,
      lap_number: 14,
      lap_duration: 84.321
    }
  },
  {
    topic: "v1/intervals",
    payload: {
      _id: 10_004_2,
      _key: "interval-4",
      driver_number: 4,
      gap_to_leader: 1.234,
      interval: 1.234
    }
  },
  {
    topic: "v1/race_control",
    payload: {
      _id: 10_005,
      _key: "race-control-1",
      category: "Flag",
      flag: "GREEN",
      message: "GREEN LIGHT - PIT EXIT OPEN"
    }
  },
  {
    topic: "v1/weather",
    payload: {
      _id: 10_006,
      _key: "weather-latest",
      air_temperature: 22.4,
      track_temperature: 35.1,
      humidity: 61,
      rainfall: 0,
      wind_speed: 5.7,
      wind_direction: 184
    }
  },
  {
    topic: "v1/location",
    payload: {
      _id: 10_007,
      _key: "location-1",
      driver_number: 1,
      x: 125.4,
      y: -42.2,
      z: 0
    }
  },
  {
    topic: "v1/car_data",
    payload: {
      _id: 10_008,
      _key: "car-data-1",
      driver_number: 1,
      speed: 287,
      throttle: 92,
      brake: 0,
      n_gear: 7,
      rpm: 11_250
    }
  },
  {
    topic: "v1/stints",
    payload: {
      _id: 10_009,
      _key: "stint-1-2",
      driver_number: 1,
      compound: "MEDIUM",
      stint_number: 2,
      tyre_age_at_start: 6
    }
  },
  {
    topic: "v1/pit",
    payload: {
      _id: 10_010,
      _key: "pit-1-14",
      driver_number: 1,
      lap_number: 14,
      pit_duration: 2.71
    }
  }
] as const;
