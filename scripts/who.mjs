// Demo 2 and 3: ask for the feed a few times; show which replica answered and
// what it said about one event. Works on every platform.
//   node scripts/who.mjs                  6 requests, free-samosas
//   node scripts/who.mjs 10 pizza-night
const N = Number(process.argv[2] ?? 6);
const EVENT = process.argv[3] ?? "free-samosas";
for (let i = 0; i < N; i += 1) {
  const res = await fetch("http://localhost:3734/events", { cache: "no-store" });
  const list = await res.json();
  const e = list.find((x) => x.id === EVENT);
  const cache = res.headers.get("x-cache-status");
  console.log(`  ${res.headers.get("x-served-by")}  ${EVENT}: ${e ? e.portionsLeft : "?"} left${cache ? `  (${cache})` : ""}`);
}
