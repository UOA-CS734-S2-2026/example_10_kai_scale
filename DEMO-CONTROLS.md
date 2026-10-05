# Demo controls — operator guide

This repo uses git tags to organise the steps, driven by `demo.sh`
(macOS/Linux) and `demo.ps1` (Windows). Same system as earlier examples; the
one difference is what `run` does.

## The status bar buttons

Opening this folder in VS Code puts six buttons along the bottom: **Prev step**,
**Next step**, **List steps**, **Jump**, **First step** and **main**. They come from
the Task Buttons extension (`spencerwmiles.vscode-task-buttons`), which VS Code
offers to install the first time you open the folder. Everything they do is
also in the terminal commands below.

## The short version

```
./demo.sh run             # build and start the containers for this step
./demo.sh list            # show all steps, marking the current one with *
./demo.sh next            # move forward one step
./demo.sh prev            # move back one step
./demo.sh jump 04         # jump straight to step 4
./demo.sh discard-changes # throw away edits, stay put
./demo.sh reset           # leave the demo, back to main
docker compose down       # stop everything at the end
```

On Windows use `.\demo.ps1` instead. If macOS or Linux says "Permission
denied", run `chmod +x demo.sh tools/up.sh` first.

## What happens on a step change

`git reset --hard HEAD`, then `git clean -fd`, then `git checkout <tag>`.
Moving between steps **discards any changes you have made**. `.env` and
`web/.env.local` are ignored files, so they survive every step change.

## After every step change: `./demo.sh run`

Unlike earlier examples, the server now runs in containers, and a container
does not notice when files change on your disk. So after `next`, run `run`:

1. `docker compose up -d --build --force-recreate --remove-orphans` rebuilds the
   server image if the step changed server code, recreates every container
   from scratch, and removes services the step no longer has. Recreating means
   the in-memory steps always start with full portions.
2. `docker compose restart web`, because nginx looks up the replicas'
   addresses when it starts.
3. `docker compose logs -f`. Ctrl+C stops following the logs; the containers
   keep running.

The dashboard is at http://localhost:8080 throughout; reload the page after each run.

## Running order

Two terminals and a browser:

1. `./demo.sh run`: the containers, and their logs
2. the repo root, for `node scripts/...` and `git diff`
3. the browser on http://localhost:8080: the dashboard

## Lecture 18, step by step

| Lecture moment | Do this | The room sees |
| --- | --- | --- |
| Before the lecture | `./demo.sh jump 00`, `./demo.sh run`, open http://localhost:8080 | The dashboard, as in Week 9, served from the `web` container as in Lab 06 |
| Demo 1: averages lie | `./demo.sh next`, `./demo.sh run`, then `node scripts/load.mjs` | Average about 350 ms, p50 about 300 ms, p99 over 1,000 ms |
| Demo 2: two realities | `./demo.sh next`, `./demo.sh run`. Eat a few portions: `node scripts/hammer.mjs 5`. Then `node scripts/who.mjs` and press Refresh on the dashboard (localhost:8080) a few times. Optional: post an event from the dashboard, then Refresh | Answers alternate between two replicas, and free-samosas has two different portion counts. A posted event appears and disappears |
| Demo 3: shared store | `./demo.sh next`, `./demo.sh run`, then `node scripts/who.mjs` | One count from both replicas. The logs show a `decay tick` from each replica every 15 s |
| Demo 3, the fix | `./demo.sh next`, `./demo.sh run` | Only the `ticker` service logs decay ticks |
| Demo 4: one greedy user | `./demo.sh next`, `./demo.sh run`, then `node scripts/hammer.mjs` | Four 200s, then 429 with Retry-After |
| Demo 5: caching | At step 5, `node scripts/load.mjs`. Then `./demo.sh next`, `./demo.sh run`, `node scripts/load.mjs` | Throughput up several times, p50 from about 300 ms to about 10 ms, and the api answered only a handful of requests |

`git diff` between neighbouring tags shows the room exactly what each step
changed.

## Portions run out: refilling

The decay ticker takes 0 to 2 portions from every event every 15 seconds, and
the seed events start small, so they empty in a few minutes.

- **Steps 0 to 2 (in memory):** `./demo.sh run` again. Fresh containers, full
  portions.
- **Step 3 onward (Firestore):** run the example_10 seed script inside a
  container. It refills the six events and leaves your organiser document
  alone:

  ```
  docker compose exec api node_modules/.bin/tsx src/seed.ts
  ```

  Do this just before Demo 3, and again before Act 2 on Tuesday. Do **not** use
  `POST /reset` for this: it also deletes every organiser that is not one of
  the four seeds, including your own account.

## If something goes wrong

- **"Ask an admin to add this user id to the organisers collection"**: on steps
  0 to 2, put that id in `KAI_ORGANISERS` in `.env`, then `./demo.sh run`. On
  step 3 and later, add a document with that id to the `organisers` collection
  in the Firebase console (fields `name` and `dept`), as in Week 9.
- **502 Bad Gateway**: `docker compose restart web`.
- **The dashboard shows "Could not reach the Kai server"**: `docker compose ps`;
  wait until the api replicas say `(healthy)`.
- **"Copy .env.example to .env"**: the key path is missing from `.env`.
- **Port 3734 or 8080 already in use**: a server from an earlier example, or
  the Lab 06 containers, are still running. Stop them.
- **Start completely clean**: `docker compose down`, `./demo.sh jump 00`,
  `./demo.sh run`.

## Rebuilding the steps

The step tags are built from `main` by `tools/build-steps.sh`, using the files
in `tools/steps/`. After changing anything on `main`, run it again and push
with `git push --force --tags`.
