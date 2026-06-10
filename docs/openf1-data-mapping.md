# OpenF1 Data Mapping

This document will track how PitWall maps dashboard features to OpenF1 topics.

For the current full planning reference, see:

- [`project-plan.md`](./project-plan.md)

## Key Topics

- `v1/sessions`
- `v1/drivers`
- `v1/position`
- `v1/intervals`
- `v1/laps`
- `v1/location`
- `v1/race_control`
- `v1/stints`
- `v1/pit`
- `v1/weather`
- `v1/car_data`

## Principle

REST is useful for data shape and initial lookups.

MQTT/WebSockets should be used for live race data.