#!/usr/bin/env bash
# Demo stepping controls. See DEMO-CONTROLS.md for the full operator guide.
set -euo pipefail
cd "$(dirname "$0")"
[ -f demo.conf ] && . ./demo.conf

TAG_PREFIX="${TAG_PREFIX:-step-}"
RUN_CMD="${RUN_CMD:-npm run dev}"

tags() { git tag -l "${TAG_PREFIX}*" | sort; }
current() { git describe --tags --exact-match 2>/dev/null || echo ""; }

index_of() {
  local target="$1" i=0
  while IFS= read -r t; do
    [ "$t" = "$target" ] && { echo "$i"; return 0; }
    i=$((i + 1))
  done < <(tags)
  echo "-1"
}

goto() {
  git reset --hard HEAD >/dev/null
  git clean -fd >/dev/null
  git checkout --quiet "$1"
  echo "Now on: $1"
}

move() {
  local delta="$1" cur idx target total
  cur="$(current)"
  total="$(tags | wc -l | tr -d ' ')"
  if [ -z "$cur" ]; then
    target="$(tags | head -n 1)"
  else
    idx="$(index_of "$cur")"
    idx=$((idx + delta))
    [ "$idx" -lt 0 ] && { echo "Already at the first step."; exit 0; }
    [ "$idx" -ge "$total" ] && { echo "Already at the last step."; exit 0; }
    target="$(tags | sed -n "$((idx + 1))p")"
  fi
  goto "$target"
}

case "${1:-help}" in
  run)             exec $RUN_CMD ;;
  list)            cur="$(current)"; while IFS= read -r t; do
                     if [ "$t" = "$cur" ]; then echo "* $t"; else echo "  $t"; fi
                   done < <(tags) ;;
  next)            move 1 ;;
  prev)            move -1 ;;
  jump)            [ $# -ge 2 ] || { echo "Usage: ./demo.sh jump 03"; exit 1; }
                   t="$(tags | grep -E "^${TAG_PREFIX}0*$2(-|$)" | head -n 1)"
                   [ -n "$t" ] || { echo "No step matching '$2'."; exit 1; }
                   goto "$t" ;;
  discard-changes) git reset --hard HEAD >/dev/null; git clean -fd >/dev/null
                   echo "Changes discarded. Still on: $(current)" ;;
  reset)           git reset --hard HEAD >/dev/null; git clean -fd >/dev/null
                   git checkout --quiet main; echo "Back on main." ;;
  *)               cat <<USAGE
${DEMO_NAME:-Demo} controls

  ./demo.sh run              Bring the stack up for this step
  ./demo.sh list             Show all available steps
  ./demo.sh next             Move to the next step
  ./demo.sh prev             Move to the previous step
  ./demo.sh jump 05          Jump to a specific step
  ./demo.sh discard-changes  Throw away your changes, stay on this step
  ./demo.sh reset            Leave the demo, return to the main branch

Moving between steps DISCARDS any changes you have made. That is intentional.
USAGE
  ;;
esac
