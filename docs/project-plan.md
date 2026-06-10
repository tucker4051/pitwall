# PitWall — F1 Live Race Dashboard Project Plan

## 1. Project Overview

**PitWall** is a live Formula 1 race companion dashboard powered by OpenF1.

The application is designed to be used while watching a live Grand Prix, providing a second-screen view of key race information such as driver positions, timing, gaps, race-control updates, weather, tyre strategy, selected telemetry and a live track map.

The aim is not to replace the live broadcast. The aim is to add extra context that television coverage may not show at the exact moment the viewer wants it.

### Short Description

> A second-screen F1 dashboard for live race insight.

---

## 2. Core Problem

When watching a live Formula 1 race, the broadcast does not always show every useful piece of information.

A viewer may want to know:

* Where a selected driver is on track.
* Which drivers are close to each other.
* Who is gaining or losing time.
* Who has already pitted.
* What tyres each driver is using.
* How old each tyre stint is.
* Whether weather conditions are changing.
* What race-control messages have been issued.
* What is happening outside the main broadcast focus.

PitWall solves this by presenting key live race data in a clear, interactive dashboard.

---

## 3. Target User

### Primary User

The primary user is an F1 fan watching a live race who wants deeper real-time context than the broadcast provides.

### Secondary User

A technically minded motorsport fan who wants to explore timing, strategy, telemetry and race events through a live dashboard.

### Personal Use Case

This is initially a personal project intended to be used during live race weekends. It should also be suitable as a portfolio project demonstrating:

* API integration
* Live data handling
* Real-time frontend updates
* Backend architecture
* UI design
* Docker-based deployment
* Security-aware public hosting

---

## 4. Project Type

This project will be a **live web dashboard**.

The initial focus is:

* Live race usage.
* Desktop, laptop or tablet second-screen experience.
* Real-time data display.
* Clean dashboard-style interface.
* Publicly accessible free dashboard.
* Open-source GitHub project.
* Self-hostable Docker-based deployment.

This is not intended to start as:

* A historical race explorer.
* A mobile-first app.
* A public betting, fantasy or prediction tool.
* A replacement for official F1 timing products.
* A paid subscription product.
* A user-account-based platform.

---

## 5. MVP Scope

The MVP should provide a usable live race dashboard that can be opened during a Formula 1 Grand Prix and used as a second-screen companion.

The first version should focus on showing:

* Live race state
* Driver order
* Driver positions
* Key race events
* Selected-driver detail
* Supporting race context

The MVP should not attempt to include every possible F1 data point. It should prioritise:

* Clarity
* Reliability
* Live race usefulness
* A clean second-screen experience

---

## 6. MVP Feature Hierarchy

### Must Have

The following features are required for the first usable version:

* Connection / session status
* Live timing tower
* Live track map / driver position overlay
* Driver focus panel
* Race-control feed

### Should Have

The following features should be included if practical, but they support the main dashboard rather than define it:

* Tyre and stint information
* Weather panel
* Basic selected-driver telemetry

### Could Have Later

The following features are future enhancements and are not part of the MVP:

* Sector status overlays
* Yellow flag / safety car zone overlays
* Overtake Mode highlighting
* Boost / Recharge indicators
* Driver trails
* Battle highlighting
* Alerts / notifications
* Strategy predictions
* User accounts
* Paid subscriptions
* Race replay
* Historical analysis
* Session snapshots
* Diagnostics dashboard
* Post-race review mode
* Persistent user preferences
* Mobile layout
* Advanced telemetry charts

---

## 7. MVP Feature Summary

### 7.1 Connection / Session Status

Shows whether the dashboard is connected to live race data and whether the displayed information is current.

Should show:

* Connected / disconnected state
* Current session name
* Current session type, such as Race, Qualifying or Practice
* Last update time
* Reconnecting state
* Error state if live data is unavailable
* Stale data warning

This is important because the dashboard is live. If the app silently freezes or disconnects, the user could incorrectly assume the displayed race data is still accurate.

---

### 7.2 Live Timing Tower

Shows the current race order and key timing information for each driver.

Should show:

* Position
* Driver abbreviation
* Team colour indicator
* Gap to leader
* Interval to car ahead
* Last lap time
* Best lap time
* Current tyre compound, if available
* Pit stop or stint indicator, if available

The timing tower acts as the main race overview panel.

---

### 7.3 Live Track Map / Driver Position Overlay

Shows the approximate real-time position of each driver on the circuit.

For the MVP, the track map should show:

* Circuit outline
* Driver markers
* Driver abbreviations or numbers
* Highlighted selected driver
* Basic relative position on track

The MVP track map does not need to be broadcast-grade or overly complex. It only needs to provide a useful visual reference of where drivers are on the circuit during the live race.

Later enhancements may include:

* Sector status overlays
* Yellow flag zone highlighting
* Safety car or virtual safety car context
* Overtake Mode highlighting
* Boost / Recharge indicators
* Driver trails
* Battle highlighting

---

### 7.4 Driver Focus Panel

Shows detailed live information for the currently selected driver.

The user should be able to select a driver from either the timing tower or the track map.

Should show:

* Driver name
* Team
* Current position
* Gap to leader
* Interval to car ahead
* Current tyre compound
* Stint age
* Last lap
* Best lap
* Basic telemetry, if available

---

### 7.5 Race-Control Feed

Shows live official race messages and key session events.

Should show:

* Yellow flag messages
* Safety car messages
* Virtual safety car messages
* Investigations
* Penalties
* Track limits messages
* Session start, pause, resume or end messages

For the MVP, this can be a simple chronological feed.

---

### 7.6 Tyre and Stint Information

Supports race strategy understanding.

Useful information may include:

* Current tyre compound
* Stint age
* Number of pit stops
* Previous compounds
* Pit stop context

The key purpose is to help answer:

> Who has stopped, who has not, and what tyres are they on?

---

### 7.7 Weather Panel

Provides race condition context.

Useful information may include:

* Air temperature
* Track temperature
* Rainfall
* Humidity
* Wind speed
* Wind direction
* Pressure

---

### 7.8 Basic Selected-Driver Telemetry

Shows basic telemetry for the selected driver where available.

Useful telemetry values may include:

* Speed
* Throttle
* Brake
* Gear
* RPM
* DRS/status field where relevant to the available OpenF1 data

This does not need to be an advanced engineering-grade telemetry tool in the MVP.

---

## 8. OpenF1 Data Source Mapping

OpenF1 provides REST endpoints, MQTT and WebSocket access.

For this project:

* REST is useful for understanding the data model and performing initial/on-demand lookups.
* MQTT/WebSockets should be prioritised for live race data.
* OpenF1 live topics map directly to REST endpoint paths.

Example topic mapping:

```text
REST endpoint: /v1/location
Live topic:    v1/location
```

### MVP Data Mapping

| MVP Feature                 | Required Data                                                                | OpenF1 Topic / Endpoint                                                            |
| --------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Connection / session status | Current session, session type, update health, latest message timestamp       | `v1/sessions` plus internal stream health                                          |
| Live timing tower           | Position, gap to leader, interval to car ahead, lap data, driver details     | `v1/position`, `v1/intervals`, `v1/laps`, `v1/drivers`                             |
| Live track map              | Approximate x/y/z car coordinates and driver identifiers                     | `v1/location`, `v1/drivers`                                                        |
| Driver focus panel          | Driver identity, current position, gaps, lap data, stint data, telemetry     | `v1/drivers`, `v1/position`, `v1/intervals`, `v1/laps`, `v1/stints`, `v1/car_data` |
| Race-control feed           | Race-control messages, flags, incidents, safety car messages, session events | `v1/race_control`                                                                  |
| Tyre and stint information  | Compound, stint number, lap start/end, tyre age, pit information             | `v1/stints`, `v1/pit`                                                              |
| Weather panel               | Air temperature, track temperature, humidity, rainfall, wind, pressure       | `v1/weather`                                                                       |
| Basic telemetry             | Speed, throttle, brake, gear, RPM, status fields where available             | `v1/car_data`                                                                      |

### Important OpenF1 Data Notes

* `location` provides approximate x/y/z car coordinates and is suitable for a live track map, but it should be treated as approximate.
* `car_data` provides telemetry-like values such as speed, throttle, brake, gear and RPM.
* `intervals` provides gap to leader and interval to the car ahead during races.
* `weather` updates more slowly and should be treated as low-frequency context data.
* OpenF1 live messages include `_id` and `_key`.
* `_id` can be used for message ordering.
* `_key` can be used to identify updates to the same underlying object.

---

## 9. High-Level Architecture

The agreed architecture is:

```text
OpenF1 Live Feed
        ↓
Backend Live Data Service
        ↓
Frontend Dashboard
```

The frontend will not connect directly to OpenF1.

The backend will act as a trusted middle layer between OpenF1 and the dashboard.

### Backend Responsibilities

The backend will:

* Connect to OpenF1 via MQTT/WebSockets.
* Manage OpenF1 authentication and tokens.
* Subscribe to required live topics.
* Receive raw JSON messages.
* Parse and validate incoming messages.
* Maintain current in-memory race state.
* Generate dashboard-ready updates.
* Send structured updates to the frontend over WebSockets.
* Track connection health and stale data.
* Avoid exposing secrets to the browser.

### Frontend Responsibilities

The frontend will:

* Render the live dashboard.
* Maintain a single WebSocket connection to the backend.
* Receive structured update messages.
* Route each message to the relevant UI state/component.
* Allow driver selection.
* Display connection and stale data states.
* Avoid direct OpenF1 authentication or raw topic subscriptions.

---

## 10. Backend Component Breakdown

The backend should be split into five main components:

```text
Backend Live Data Service
├── 1. OpenF1 Connector
├── 2. Authentication / Token Manager
├── 3. Message Processor
├── 4. Race State Manager
└── 5. Frontend Update Gateway
```

### 10.1 OpenF1 Connector

Responsible for:

* Connecting to OpenF1 live feed.
* Subscribing to required topics.
* Receiving raw JSON messages.
* Detecting connection loss.
* Reconnecting when needed.
* Passing messages to the Message Processor.

### 10.2 Authentication / Token Manager

Responsible for:

* Storing OpenF1 credentials safely.
* Requesting OAuth2 access tokens.
* Tracking token expiry.
* Refreshing tokens where required.
* Providing valid tokens to the OpenF1 Connector.

### 10.3 Message Processor

Responsible for:

* Parsing incoming JSON.
* Identifying source topic.
* Validating expected fields.
* Sorting or sequencing messages using `_id`.
* Applying updates using `_key`.
* Dropping malformed or irrelevant messages.
* Converting raw OpenF1 data into internal application structures.

### 10.4 Race State Manager

Responsible for maintaining current live race state.

The state may include:

* Session status
* Driver details
* Timing tower data
* Track position data
* Race-control messages
* Tyre and stint data
* Weather data
* Selected telemetry snapshots
* Connection health

### 10.5 Frontend Update Gateway

Responsible for:

* Sending dashboard-ready updates to connected browser clients.
* Sending only data required by the dashboard.
* Providing connection status.
* Batching or throttling high-frequency updates where appropriate.
* Avoiding unnecessary frontend update volume.

---

## 11. Storage Decision

For the MVP, the backend does not require a database or long-term storage.

The application will maintain live race state in memory while the dashboard is running.

Persistent storage may be reconsidered later if the project adds features such as:

* Race replay
* Race snapshots
* Diagnostics
* Post-race review
* User accounts
* Historical analysis

---

## 12. Agreed Tech Stack

### Frontend

* React
* TypeScript
* Next.js
* Tailwind CSS
* shadcn/ui

### Backend

* Node.js
* TypeScript
* MQTT.js
* WebSockets

### State / Storage

* In-memory live race state for MVP
* No database required for the initial version

### Hosting / Deployment

* Docker
* Docker Compose
* GitHub open-source repository
* Existing Ubuntu VPS
* Plesk/nginx reverse proxy
* HTTPS/WSS in production

---

## 13. Node.js Performance and Scalability Position

Node.js is suitable for this project because the backend workload is primarily I/O-bound rather than CPU-heavy.

The backend will mainly:

* Connect to OpenF1 live data.
* Receive MQTT/WebSocket messages.
* Parse JSON.
* Update in-memory race state.
* Push dashboard-ready updates to connected frontend clients.

Node.js is not multi-threaded in the traditional “one request per thread” model. Instead, it uses an event-driven, non-blocking I/O model. This makes it efficient for handling many concurrent network connections when the application avoids blocking the event loop.

The backend should avoid:

* Expensive synchronous processing.
* Blocking file operations.
* Sending every raw live message directly to every frontend client.
* Performing heavy calculations inside message handlers.
* Treating the frontend as a raw data firehose.

The backend should instead:

* Keep message handlers small.
* Normalise incoming data.
* Maintain current race state.
* Batch or throttle high-frequency updates where needed.
* Send dashboard-ready data to the frontend.
* Avoid unnecessary frontend update volume.

For the MVP, a single Node.js backend service should be sufficient.

If the project later grows to support a large number of concurrent users, the architecture can evolve into:

```text
OpenF1
  ↓
Dedicated ingestion service
  ↓
Shared pub/sub or state layer
  ↓
Multiple frontend gateway instances
  ↓
Load balancer
  ↓
Users
```

---

## 14. UI Layout and Dashboard Design

The dashboard will use a desktop/laptop-first pit-wall style layout.

The initial layout will include:

* A persistent top status bar
* A left-side live timing tower
* A central live track map / driver position overlay
* A right-side driver focus panel
* A lower live context area for race-control, tyres/stints, weather and telemetry

### Layout Concept

```text
┌──────────────────────────────────────────────────────────────┐
│ Top Status Bar                                               │
│ Session | Connection | Lap | Race Status | Last Update        │
├───────────────┬──────────────────────────────┬───────────────┤
│ Timing Tower  │ Live Track Map               │ Driver Focus  │
│               │                              │               │
│ Driver order  │ Driver position overlay      │ Selected      │
│ Gaps          │ Circuit view                 │ driver detail │
│ Intervals     │                              │               │
├───────────────┴──────────────────────────────┴───────────────┤
│ Race Control Feed | Tyres/Stints | Weather | Telemetry        │
└──────────────────────────────────────────────────────────────┘
```

### Design Principles

The dashboard should be:

* Compact
* Structured
* Live
* Easy to scan
* High contrast
* Dark dashboard style
* Motorsport-inspired
* Suitable for desktop/laptop second-screen use

The dashboard should prioritise:

* Quick scanning
* Clear visual hierarchy
* Live race usability
* Low clutter

---

## 15. Live Data Flow and State Design

The frontend should not receive raw OpenF1 messages directly.

Instead, the backend should receive, process and normalise OpenF1 messages before sending structured dashboard updates to the frontend.

### Preferred Flow

```text
OpenF1 topic message
        ↓
Backend receives message
        ↓
Message is parsed and validated
        ↓
Current race state is updated
        ↓
Dashboard-ready update is generated
        ↓
Frontend receives update over WebSocket
        ↓
Relevant UI component updates
```

### CurrentRaceState

The backend should maintain a single in-memory current race state.

Example structure:

```text
CurrentRaceState
├── connection
├── session
├── drivers
├── timing
├── trackPositions
├── selectedDriver
├── raceControlMessages
├── stints
├── pitEvents
├── weather
└── telemetry
```

### Message Handling Flow

Each incoming message should follow this process:

```text
Receive message
↓
Parse JSON
↓
Identify source topic
↓
Validate required fields
↓
Use _id for message ordering where needed
↓
Use _key to update existing objects where relevant
↓
Update CurrentRaceState
↓
Emit dashboard-ready update if needed
```

### Frontend Connection Model

The frontend should use a single WebSocket connection to the backend for the MVP.

Different dashboard areas should not open separate backend connections.

Instead, the backend should send structured message types over one connection.

Example message types:

```text
connection:update
session:update
timing:update
track:update
driver-focus:update
race-control:update
weather:update
telemetry:update
```

### Update Frequency Considerations

Different OpenF1 topics update at different rates.

The backend should not treat all updates equally.

| Data Type                   | Example Topics                                         | Frontend Update Approach |
| --------------------------- | ------------------------------------------------------ | ------------------------ |
| High-frequency              | `v1/location`, `v1/car_data`                           | Throttle or batch        |
| Medium-frequency            | `v1/intervals`, `v1/position`, `v1/laps`               | Send when changed        |
| Low-frequency / event-based | `v1/race_control`, `v1/weather`, `v1/stints`, `v1/pit` | Send on update           |

### Stale Data and Connection Health

The backend should track:

* `lastMessageReceivedAt`
* `lastMessageByTopic`
* `lastUpdateByDriver`
* `connectionStatus`

This allows the frontend to show clear states such as:

* LIVE
* CONNECTED
* RECONNECTING
* STALE DATA
* DISCONNECTED

---

## 16. Security and Public Hosting Readiness

The first hosted version of the dashboard will be publicly accessible and free to view.

Authentication, paid subscriptions and user accounts are not part of the MVP.

### Core Security Principle

> The frontend must never handle OpenF1 credentials or OAuth2 access tokens.

Only the backend should communicate directly with OpenF1.

### Public User Capabilities

Public users should be able to:

* Open the dashboard.
* View live race data.
* View the timing tower.
* View the live track map.
* Select drivers.
* View driver detail.
* View race-control messages.
* View approved supporting information.
* Interact with approved dashboard controls.

Public users should not be able to:

* Access OpenF1 credentials.
* Access OpenF1 OAuth2 tokens.
* Choose arbitrary OpenF1 topics.
* Use the backend as a generic OpenF1 proxy.
* Subscribe directly to raw OpenF1 feeds.
* Overload the backend with uncontrolled requests.
* Create excessive WebSocket connections.

### Backend Access Control Model

The backend should expose only the functionality required by the dashboard.

It should not expose flexible proxy-style endpoints such as:

```text
/api/openf1?topic=v1/anything
```

It should not allow frontend-controlled arbitrary topic subscriptions.

### MVP Security Scope

The MVP should include:

* Backend-only OpenF1 access.
* Server-side credential and token handling.
* Public frontend access.
* Controlled backend WebSocket/API access.
* No arbitrary OpenF1 proxy behaviour.
* No frontend-controlled topic subscriptions.
* HTTPS/WSS in production.
* Environment variable-based secrets.
* Basic input validation.
* Safe error handling.
* Basic rate limiting or connection limiting where practical.
* Dependency hygiene.
* `.env` excluded from Git.
* `.env.example` with placeholder values only.

### Future Access Model

If the dashboard becomes highly popular, the project may later introduce:

* User accounts
* Authentication
* Usage limits
* Premium live features
* Paid subscriptions
* Private dashboards
* Advanced analytics
* Tiered access to higher-frequency updates

These are not part of the MVP.

---

## 17. Hosting, Deployment and Development Environment

### Hosting Direction

The project will be hosted on the existing Ubuntu VPS.

The preferred hosting model is:

```text
Internet
   ↓
Cloudflare / DNS
   ↓
Plesk-managed domain + nginx
   ↓
Reverse proxy
   ↓
Dockerised application services on Ubuntu VPS
```

### Plesk Usage

Plesk may be used for:

* Domain management
* Subdomain management
* TLS / Let’s Encrypt certificate handling
* nginx reverse proxy configuration
* Basic web hosting administration
* Public HTTPS/WSS exposure

The core application runtime should run in Docker containers on the VPS.

### Docker Decision

Docker and Docker Compose will be used.

Initial container model:

```text
Docker Compose
├── pitwall-frontend
│   └── Next.js dashboard
└── pitwall-backend
    ├── OpenF1 MQTT connection
    ├── Message processing
    ├── In-memory race state
    └── WebSocket gateway
```

No database container is required for the MVP.

### Open-Source Repository

The project will be hosted on GitHub and made open source.

Possible repository structure:

```text
pitwall/
├── frontend/
├── backend/
├── docs/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
└── LICENSE
```

### Environment Variables

The repository should include:

```text
.env.example
```

The repository should not include:

```text
.env
.env.local
.env.production
```

Example `.env.example`:

```env
# OpenF1 credentials
OPENF1_USERNAME=your_openf1_username
OPENF1_PASSWORD=your_openf1_password

# Backend configuration
BACKEND_PORT=3001
NODE_ENV=production

# Frontend public configuration
NEXT_PUBLIC_BACKEND_WS_URL=wss://your-domain.example/ws
NEXT_PUBLIC_APP_NAME=PitWall
```

Private backend-only variables must remain server-side only.

Public frontend variables may use the `NEXT_PUBLIC_` prefix.

Secrets must never use the `NEXT_PUBLIC_` prefix.

### Development Environment

The primary development environment will be the developer’s CachyOS Linux machine.

A virtual machine is not required for normal development because Docker Compose will provide application-level isolation and a consistent runtime environment.

A VM may be used later for:

* Testing a clean Ubuntu-like deployment environment
* Validating self-hosting instructions from scratch
* Simulating the VPS before deployment
* Testing the project in a disposable environment

---

## 18. Build Roadmap

The project will be built using a milestone-based roadmap.

The roadmap follows four stages:

```text
Stage 1 — Project Foundation
Stage 2 — Live Data Pipeline
Stage 3 — MVP Dashboard Build
Stage 4 — Public Release
```

The guiding principle is:

> Build the pipes before the dashboard.

---

### Stage 1 — Project Foundation

Goal: Establish the basic project structure and make sure the application can run locally.

Milestones:

1. Repository foundation
2. Docker foundation
3. Backend skeleton
4. Frontend skeleton

Success criteria:

* GitHub repository exists.
* Base folder structure is in place.
* Frontend and backend folders exist.
* Docker Compose can start the project.
* Frontend service starts.
* Backend service starts.
* No secrets are committed.
* `.env.example` exists.
* Basic setup notes exist.

---

### Stage 2 — Live Data Pipeline

Goal: Prove that live data can flow through the system.

Milestones:

1. WebSocket proof of concept
2. OpenF1 connection prototype
3. Race state manager

Success criteria:

* Backend can open a WebSocket connection to the frontend.
* Frontend can receive structured backend messages.
* Backend can connect to OpenF1 or a mock OpenF1 feed.
* Incoming messages can be parsed and handled.
* Backend can maintain basic in-memory race state.
* Frontend can display live/debug updates from the backend.
* High-frequency data can be throttled or batched at a basic level.

---

### Stage 3 — MVP Dashboard Build

Goal: Turn the live data pipeline into the user-facing dashboard.

Milestones:

1. Dashboard layout
2. Core MVP features
3. Supporting MVP features

Recommended feature build order:

1. Top status bar
2. Timing tower
3. Track map
4. Driver focus panel
5. Race-control feed
6. Weather panel
7. Tyre/stint panel
8. Selected-driver telemetry

---

### Stage 4 — Public Release

Goal: Prepare the MVP for public hosting and open-source use.

Milestones:

1. Security hardening
2. VPS deployment
3. Public MVP polish

Success criteria:

* OpenF1 credentials are handled through environment variables.
* `.env` files are excluded from Git.
* `.env.example` is complete.
* Frontend does not expose secrets.
* WebSocket client messages are validated.
* Unsafe or unsupported client requests are rejected.
* Docker Compose works on the VPS.
* Plesk/nginx reverse proxy is configured.
* HTTPS/WSS works in production.
* Dashboard is publicly accessible.
* README setup instructions are usable.
* Self-hosting guidance is included.
* Basic project documentation is complete.

---

## 19. Testing Strategy

The project will use a layered testing approach.

The guiding principle is:

> Prove the live data pipeline before polishing the dashboard.

### Testing Layers

The project should use:

1. Unit testing
2. Mock live feed testing
3. Backend integration testing
4. Frontend component testing
5. End-to-end testing
6. Deployment testing
7. Security testing
8. Manual race-day testing

### Mock Mode

Mock mode is critical.

Example environment variable:

```env
DATA_MODE=mock
```

In mock mode:

* Backend does not require OpenF1 live access.
* Mock messages are generated internally.
* Dashboard behaves as if a race is live.
* Frontend, backend and end-to-end tests can run without a live F1 session.

### Live Mode

Example environment variable:

```env
DATA_MODE=live
```

In live mode:

* Backend connects to OpenF1.
* OAuth2 credentials are required.
* Live MQTT/WebSocket topics are consumed.
* Dashboard reflects real live race data.

### Recommended Tools

* Vitest or Jest for unit tests
* React Testing Library for frontend component tests
* Playwright for end-to-end tests
* Docker Compose for local deployment testing

### Testing Priority

Testing priority:

```text
1. Mock feed works
2. Backend state updates correctly
3. WebSocket messages reach the frontend
4. Frontend renders the received state
5. Dashboard works end-to-end in mock mode
6. Dashboard works with real OpenF1 live data
7. Deployment works securely over HTTPS/WSS
```

---

## 20. Super Productivity Project Structure

The project will be managed in Super Productivity using one project:

```text
PitWall — F1 Live Race Dashboard
```

Top-level tasks:

```text
Stage 1 — Project Foundation
Stage 2 — Live Data Pipeline
Stage 3 — MVP Dashboard Build
Stage 4 — Public Release
Future Backlog
```

Each stage contains actionable subtasks.

Suggested tags:

```text
#mvp
#frontend
#backend
#docker
#openf1
#websocket
#mock-mode
#security
#testing
#deployment
#docs
#future
```

Practical rule:

> Only schedule tasks from the current stage into Today.

---

## 21. Development Guidance for Codex

When using Codex in VS Code, use this file as the primary planning reference.

Recommended instruction to Codex:

```text
Read docs/project-plan.md first.

Follow the architecture, stack, roadmap, MVP scope, security model and deployment approach defined there.

Do not introduce features outside the MVP unless explicitly asked.

Prioritise the build roadmap order:
1. Repository and Docker foundation
2. Backend/frontend skeletons
3. WebSocket proof of concept
4. Mock mode
5. OpenF1 connector
6. Race state manager
7. Dashboard UI
8. Public release hardening
```

Codex should assume:

* TypeScript should be used across frontend and backend.
* The frontend should not connect directly to OpenF1.
* OpenF1 credentials must remain backend-only.
* The backend should not act as a generic OpenF1 proxy.
* The frontend should use one WebSocket connection to the backend.
* Mock mode should be built early.
* Docker Compose should be the standard way to run the project.
* No database is required for the MVP.

---

## 22. Current Planning Decision

The project has enough planning to start development.

Phases 13 and 14, covering detailed README planning and future enhancement planning, can be set aside for now.

The immediate next step is to begin **Stage 1 — Project Foundation**.

First practical target:

```bash
docker compose up --build
```

Both frontend and backend services should start successfully.

Stage 1 should not be considered complete until:

* The repo exists.
* Frontend container starts.
* Backend container starts.
* Docker Compose works.
* Environment variable pattern is in place.
* No secrets are committed.
