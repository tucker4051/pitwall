# PitWall

PitWall is a live Formula 1 race dashboard built as a personal software development project.

It connects to OpenF1 live data, processes race-session information through a backend service, and displays a real-time dashboard in the browser.

The aim of the project is to create a clean second-screen experience for following F1 sessions, with a focus on timing, track position, race context, driver detail, and session awareness.

---

## Contents

* [Current MVP Features](#current-mvp-features)
* [Architecture](#architecture)
* [Tech Stack](#tech-stack)

  * [Frontend](#frontend)
  * [Backend](#backend)
  * [Runtime](#runtime)
* [Project Structure](#project-structure)
* [Local Development](#local-development)

  * [Prerequisites](#prerequisites)
* [Environment Variables](#environment-variables)
* [Running in Mock Mode](#running-in-mock-mode)
* [Running in Live Mode](#running-in-live-mode)
* [Useful Commands](#useful-commands)
* [Security Notes](#security-notes)
* [Docker Image Security](#docker-image-security)
* [Known MVP Limitations](#known-mvp-limitations)
* [Roadmap Ideas](#roadmap-ideas)
* [AI-Assisted Development](#ai-assisted-development)
* [Disclaimer](#disclaimer)
* [Status](#status)

---

## Current MVP Features

PitWall currently includes:

* Live OpenF1 backend connection
* Backend-controlled OpenF1 authentication and data processing
* WebSocket updates from backend to frontend
* In-memory live race state
* Meeting and session detection
* Driver metadata loading
* Timing tower
* Live track map with driver markers
* Driver focus panel
* Race control feed
* Weather panel
* Session information panel
* Qualifying phase display
* Q1/Q2 qualifying danger-zone highlighting
* Qualifying elimination freezing after phase transitions
* Phase-aware qualifying best-lap handling
* Race starting-grid seeding
* Live race position override once race data arrives
* Mock data mode for local development

---

## Architecture

The application follows a controlled backend-to-frontend data model.

```text
OpenF1 Live Feed
        ↓
Backend Live Data Service
        ↓
Message Processing
        ↓
In-Memory Race State
        ↓
Backend WebSocket Gateway
        ↓
Frontend Dashboard
```

The frontend does not connect directly to OpenF1.

The backend is responsible for:

* Authenticating with OpenF1
* Connecting to live OpenF1 data
* Fetching REST bootstrap data
* Processing raw OpenF1 messages
* Maintaining current session state
* Sending dashboard-ready updates to the frontend

This keeps OpenF1 credentials and tokens out of the browser.

---

## Tech Stack

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* shadcn/ui-style component approach

### Backend

* Node.js
* TypeScript
* MQTT.js
* WebSockets
* OpenF1 REST and live data

### Runtime

* Docker
* Docker Compose

---

## Project Structure

```text
pitwall/
├── backend/
├── frontend/
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## Local Development

### Prerequisites

You will need:

* Docker
* Docker Compose
* Git

This project is designed to run through Docker Compose. You do not need to install project dependencies directly on the host machine for normal development.

---

## Environment Variables

The project uses a root `.env` file for local live-mode configuration.

A safe example file is provided:

```text
.env.example
```

Create your own local `.env` file from the example:

```bash
cp .env.example .env
```

Then populate the required OpenF1 values for live mode.

Do not commit `.env`.

---

## Running in Mock Mode

Mock mode is useful for local development without OpenF1 credentials.

```bash
docker compose --env-file .env.example up --build
```

Or, if the images are already built:

```bash
docker compose --env-file .env.example up -d --no-build
```

Check backend health:

```bash
curl -s http://localhost:3001/health | jq
```

Expected output:

```json
{
  "status": "ok",
  "app": "PitWall",
  "dataMode": "mock"
}
```

---

## Running in Live Mode

Live mode requires valid OpenF1 credentials in your local `.env` file.

```bash
docker compose up --build
```

Or:

```bash
docker compose up -d --build
```

Check backend health:

```bash
curl -s http://localhost:3001/health | jq
```

Expected output:

```json
{
  "status": "ok",
  "app": "PitWall",
  "dataMode": "live"
}
```

---

## Useful Commands

Run backend type checking:

```bash
docker compose run --rm backend npm run typecheck
```

Run frontend type checking:

```bash
docker compose run --rm frontend npm run typecheck
```

Run frontend linting:

```bash
docker compose run --rm frontend npm run lint
```

Run OpenF1 fixture validation:

```bash
docker compose run --rm backend npm run validate:openf1-fixtures
```

Start mock mode:

```bash
docker compose --env-file .env.example up -d --no-build
```

Start live mode:

```bash
docker compose up -d --build
```

Stop the stack:

```bash
docker compose down
```

View backend logs:

```bash
docker compose logs -f backend
```

---

## Security Notes

OpenF1 credentials and access tokens are handled by the backend only.

The frontend should never contain:

* OpenF1 usernames
* OpenF1 passwords
* OAuth2 access tokens
* Raw OpenF1 connection strings containing secrets

The `.env` file must remain local and must not be committed.

The public frontend communicates only with the PitWall backend.

---

## Docker Image Security

Docker Scout was used during MVP preparation.

Completed release-prep actions include:

* Backend Alpine packages upgraded during image build
* Frontend Alpine packages upgraded during image build
* Critical OpenSSL base-image findings remediated

Remaining Docker Scout findings may relate to global npm tooling bundled in the Node base image rather than direct application runtime dependencies.

Future hardening should move the backend and frontend to production multi-stage images with minimal runtime contents.

---

## Known MVP Limitations

The current MVP intentionally keeps the architecture simple.

Known limitations include:

* No persistent database
* No historical replay
* No user accounts
* No authentication for viewers
* No paid or premium access model
* No Q1/Q2/Q3 countdowns
* No automatic reconstruction of qualifying eliminations after a mid-session restart
* No track-map flag-sector overlays yet
* Driver marker movement depends on live data update frequency
* Sprint Race starting-grid seeding is not yet implemented
* Race/session data depends on OpenF1 availability and live feed behaviour

---

## Roadmap Ideas

Possible future improvements include:

* Production multi-stage Docker images
* Automated CI validation
* VPS deployment automation
* Qualifying restart reconstruction from OpenF1 history
* Sprint Race grid seeding
* Track-map flag and marshal-sector overlays
* Driver trails
* Battle highlighting
* Sector status overlays
* Session replay
* Historical race analysis
* User preferences
* Mobile and tablet layouts
* Public API documentation

---

## AI-Assisted Development

This project was developed with assistance from OpenAI Codex and ChatGPT.

Codex was used as an AI coding assistant to help implement features, refactor code, investigate issues, and generate development iterations from human-written prompts. ChatGPT was used to support planning, architecture decisions, debugging, documentation, and development workflow.

The project direction, feature decisions, architecture choices, validation, testing, review, and final acceptance were carried out by the project author.

AI assistance was used as part of the development process, but the implementation was reviewed, tested, and integrated manually.

---

## Disclaimer

PitWall is an independent personal project and is not affiliated with Formula 1, the FIA, F1 teams, or OpenF1.

Formula 1 data availability depends on OpenF1 and the live session data exposed through its services.

---

## Status

PitWall is currently at MVP stage.

The project is functional locally in mock mode and live mode, with public deployment preparation in progress.
