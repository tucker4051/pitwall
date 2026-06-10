# Security

This document will track security decisions for PitWall.

For the current full planning reference, see:

- [`project-plan.md`](./project-plan.md)

## Core Principle

The frontend must never handle OpenF1 credentials or OAuth2 access tokens.

## MVP Security Direction

- Backend-only OpenF1 access
- No arbitrary OpenF1 proxy behaviour
- No frontend-controlled topic subscriptions
- HTTPS/WSS in production
- Environment variable-based secrets
- Safe error handling
- Basic validation and rate limiting where practical