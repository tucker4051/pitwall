export const OPENF1_FIXTURE_RECEIVED_AT = new Date("2026-06-11T12:00:00.000Z");

export const OPENF1_FIXTURE_MESSAGES = [
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
  }
] as const;
