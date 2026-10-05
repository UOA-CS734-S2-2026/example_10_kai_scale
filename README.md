# Kai Finder, scaled

The live demo for **COMPSCI 734, Lecture 18 (Week 10): From One Server to Many**.

This is example_10 (the Kai Events server and the organiser dashboard, with
authentication) put under load. The dashboard does not change at all. The
server runs in containers, the way Lab 06 ran it, behind an nginx gateway, and
each step answers one of the lecture's opening problems.

| Folder | What it is |
| --- | --- |
| `server/` | The example_10 server, plus a Dockerfile and a few marked Week 10 lines |
| `web/` | The example_10 dashboard, unchanged |
| `gateway/` | The nginx config: the one front door, on port 3734 |
| `scripts/` | `load.mjs` (load test), `who.mjs` (which replica answered), `hammer.mjs` (one greedy user) |
| `compose.yaml` | The api replicas, the ticker, and the gateway |

The gateway owns port **3734**, the port the dashboard already talks to
(`VITE_KAI_SERVER`). So the dashboard needs no change: it simply starts
talking to the gateway instead of to one server.

## Built and tested with

```
Node.js v22 or newer
Docker Desktop (Docker Compose v2)
```

## Setup

You need the same Firebase project and service account key as example_10.

1. `cp .env.example .env` and set `GOOGLE_APPLICATION_CREDENTIALS` to the
   absolute path of your service account key. Compose mounts it into the
   containers read-only; it is never copied into the image.
2. In the same `.env`, set `KAI_ORGANISERS` to your own Firebase user id. Sign
   in on the dashboard at step 0 and the "not an organiser" screen shows it.
   This is only for the in-memory steps (0 to 2); from step 3, as in Week 9,
   your id needs a document in Firestore's `organisers` collection.
3. `cp web/.env.example web/.env.local` and fill in the web app config, as in
   example_10. Leave `VITE_KAI_SERVER=http://localhost:3734`.
4. `npm --prefix web install`
5. If the Firestore data is not seeded yet: `npm --prefix server install` and
   `npm --prefix server run seed`.

Nothing else needs installing on your machine: the server's dependencies are
installed inside its image.

## Running it

```
./demo.sh jump 00           # the first step
./demo.sh run               # build and start the containers, follow the logs
npm --prefix web run dev    # the dashboard, on 5734, in a second terminal
```

After every step change, run `./demo.sh run` again. It rebuilds the server
image if the step changed server code, recreates what changed, and restarts the
gateway so nginx sees the current replicas. Stop everything with
`docker compose down`.

Do not also run the server with `npm --prefix server run dev`: the gateway
needs port 3734.

## The steps

| Tag | What it adds | Lecture |
| --- | --- | --- |
| `step-00-start` | The server in a container, one replica, behind the gateway. In-memory store | Act 1 start |
| `step-01-measure` | One feed request in fifty takes 800 ms longer; `scripts/load.mjs` | Demo 1: averages lie |
| `step-02-replicas` | `replicas: 2`. Each replica has its own array; `who.mjs` and `hammer.mjs` | Demo 2: two realities |
| `step-03-shared-store` | The one-line switch to Firestore in `store.ts`. Now two decay tickers | Demo 3: one reality, double decay |
| `step-04-one-ticker` | `DECAY=off` in the replicas; one `ticker` service | Demo 3, the fix |
| `step-05-rate-limit` | The gateway limits eatPortion: a small burst, then 429. `hammer.mjs` now gets refused | Demo 4: one greedy user |
| `step-06-cache` | `Cache-Control` on the feed; the gateway caches it for 2 s | Demo 5: caching |

Every change is visible as a diff. For example:

```
git diff step-02-replicas step-03-shared-store
git diff step-04-one-ticker step-05-rate-limit -- gateway/
```

`./demo.sh list` shows the steps. See `DEMO-CONTROLS.md` for the full
running order, and `tools/build-steps.sh` for how the tags are built.

## Portions run out

The decay ticker empties the seed events in a few minutes. On the in-memory
steps, `./demo.sh run` starts fresh. From step 3, refill Firestore with
`docker compose exec api node_modules/.bin/tsx src/seed.ts` (not `POST /reset`,
which also removes non-seed organisers). See `DEMO-CONTROLS.md`.

## A note on Firestore reads

From step 3 the feed comes from Firestore, and Firestore bills reads: each
uncached `GET /events` is one read per event. `node scripts/load.mjs` sends
1,000 requests, about 6,000 reads, against a free tier of 50,000 a day. At
step 6 the same test costs a few hundred, which is the point of Demo 5, but
rehearse with the budget in mind.

## Tests

```
npm --prefix web test
npm --prefix server run typecheck
```
