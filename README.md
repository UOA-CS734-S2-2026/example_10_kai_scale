# Kai Finder, scaled

The live demo for **COMPSCI 734, Lecture 18 (Week 10): From One Server to Many**.

This is example_10 (the Kai Events server and the organiser dashboard, with
authentication) put under load, packaged exactly the way Lab 06 packaged
example_05 and example_09: an `api` container, a `web` container (the
dashboard, served by nginx, which proxies `/api/` to the api), and one
`compose.yaml`. The dashboard's code does not change at all. Each step answers
one of the lecture's opening problems.

The nginx in `web` is Lab 06's `nginx.conf`, unchanged at step 0. It is
already a reverse proxy; by step 6 it is also load-balancing, rate-limiting
and caching, which is most of what an API gateway does.

| Folder | What it is |
| --- | --- |
| `server/` | The example_10 server, with Lab 06's Dockerfile and a few marked Week 10 lines |
| `web/` | The example_10 dashboard, unchanged, with Lab 06's Dockerfile and `nginx.conf` |
| `scripts/` | `load.mjs` (load test), `who.mjs` (which replica answered), `hammer.mjs` (one greedy user) |
| `compose.yaml` | Lab 06's compose file: `api` and `web`, plus replicas and a ticker |

The dashboard is at **http://localhost:8080**, as in Lab 06, and reaches the
server through nginx at `/api/`.

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
   in on the dashboard at step 0 and the "not an organiser" screen shows it
   (then `./demo.sh run` again).
   This is only for the in-memory steps (0 to 2); from step 3, as in Week 9,
   your id needs a document in Firestore's `organisers` collection.
3. `cp web/.env.example web/.env.local` and fill in the Firebase web app
   config, as in example_10. The web image's build reads it. (`VITE_KAI_SERVER`
   in that file is ignored here: the Dockerfile sets it to `/api`, as in Lab 06.)
4. If the Firestore data is not seeded yet: `npm --prefix server install` and
   `npm --prefix server run seed`.

Nothing else needs installing on your machine: both apps' dependencies are
installed inside their images.

## Running it

```
./demo.sh jump 00           # the first step
./demo.sh run               # build and start the containers, follow the logs
```

Then open http://localhost:8080. After every step change, run `./demo.sh run`
again. It rebuilds the images if the step changed them, recreates every
container, and restarts `web` so nginx sees the current replicas. Stop
everything with `docker compose down`.

At steps 0 and 1 the api also publishes port 3734, as in Lab 06. From step 2
it cannot: two replicas cannot both own one port on your machine.

## The steps

| Tag | What it adds | Lecture |
| --- | --- | --- |
| `step-00-start` | Lab 06's setup with the example_10 apps: `api` and `web`. In-memory store | Act 1 start |
| `step-01-measure` | One feed request in fifty takes 800 ms longer; `scripts/load.mjs` | Demo 1: averages lie |
| `step-02-replicas` | `replicas: 2`, and the api's port goes. Each replica has its own array; `who.mjs` and `hammer.mjs` | Demo 2: two realities |
| `step-03-shared-store` | The one-line switch to Firestore in `store.ts`. Now two decay tickers | Demo 3: one reality, double decay |
| `step-04-one-ticker` | `DECAY=off` in the replicas; one `ticker` service | Demo 3, the fix |
| `step-05-rate-limit` | nginx limits eatPortion: a small burst, then 429. `hammer.mjs` now gets refused | Demo 4: one greedy user |
| `step-06-cache` | `Cache-Control` on the feed; nginx caches it for 2 s | Demo 5: caching |

Every change is visible as a diff. For example:

```
git diff step-02-replicas step-03-shared-store
git diff step-04-one-ticker step-05-rate-limit -- web/nginx.conf
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
