#!/usr/bin/env bash
# Rebuilds the step-NN-* tags from the current contents of main.
#
# Each step checks out the finished tree, removes the files that step has not
# introduced yet, copies in that step's versions from tools/steps/NN/, and
# commits. Run it after changing anything on main so the tags stay in sync.
#
#   ./tools/build-steps.sh
#
# Existing step tags are deleted and recreated. Nothing else is touched.
set -euo pipefail
cd "$(dirname "$0")/.."

FINAL="$(git rev-parse HEAD)"
git diff --quiet || { echo "Working tree is dirty. Commit or stash first."; exit 1; }

for t in $(git tag -l 'step-*'); do git tag -d "$t" >/dev/null; done
git checkout -q --orphan build-steps-tmp
git rm -rq --cached . >/dev/null

commit () { git add -A; git commit -qm "$2"; git tag "$1"; echo "  $1"; }
restore () { git rm -rq --cached . >/dev/null 2>&1 || true; git clean -fdq; git checkout -q "$FINAL" -- .; }
variant () { cp -R "tools/steps/$1/." .; }

echo "Building steps:"

# --- 0: the example_10 server in a container, one replica, behind nginx ------
restore
rm -f scripts/load.mjs scripts/who.mjs scripts/hammer.mjs
variant 00
commit step-00-start "Step 0: the example_10 server in a container, one replica, behind the gateway"

# --- 1: a pretend slow query, and a load test that measures percentiles ------
restore
rm -f scripts/who.mjs scripts/hammer.mjs
variant 01
commit step-01-measure "Step 1: one feed request in fifty is slow; measure percentiles"

# --- 2: two replicas, each with its own array -------------------------------
restore
rm -f scripts/hammer.mjs
variant 02
commit step-02-replicas "Step 2: two replicas, each with its own in-memory events"

# --- 3: the one-line switch to Firestore, and the ticker runs twice ---------
restore
rm -f scripts/hammer.mjs
variant 03
commit step-03-shared-store "Step 3: one shared store (Firestore); now two decay tickers"

# --- 4: the decay ticker runs in exactly one process ------------------------
restore
rm -f scripts/hammer.mjs
variant 04
commit step-04-one-ticker "Step 4: DECAY=off in the replicas, one ticker service"

# --- 5: rate limiting eatPortion at the gateway ------------------------------
restore
variant 05
commit step-05-rate-limit "Step 5: the gateway rate-limits eatPortion"

# --- 6: the gateway caches the public feed -----------------------------------
restore
commit step-06-cache "Step 6: the gateway caches the public feed for 2 seconds"

git checkout -q main
git branch -qD build-steps-tmp
echo "Done. ./demo.sh list to see them."
