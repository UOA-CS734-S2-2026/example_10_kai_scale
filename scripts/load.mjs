// A tiny load tester with no dependencies, so it runs anywhere Node 20 does.
//
//   node scripts/load.mjs                      1000 requests, 50 at a time
//   node scripts/load.mjs 2000 100             2000 requests, 100 at a time
//   node scripts/load.mjs 1000 50 http://localhost:3734/events
//
// Firestore bills reads. Once the feed comes from Firestore (step 3 on), each
// uncached request is one read per event: 1,000 requests is about 6,000
// reads, against a free tier of 50,000 a day. Rehearse with that in mind.
//
// It prints the average AND the percentiles, which is the whole point of
// Demo 1: the average can look healthy while 1 in 100 users waits a second.

const TOTAL = Number(process.argv[2] ?? 1000);
const CONCURRENCY = Number(process.argv[3] ?? 50);
const URL_ = process.argv[4] ?? "http://localhost:3734/events";

const times = [];
const statuses = {};
const servedBy = {};
const cache = {};
let next = 0;

async function worker() {
  while (next < TOTAL) {
    next += 1;
    const start = performance.now();
    try {
      const res = await fetch(URL_);
      await res.arrayBuffer();
      times.push(performance.now() - start);
      statuses[res.status] = (statuses[res.status] ?? 0) + 1;
      const who = res.headers.get("x-served-by") ?? "?";
      servedBy[who] = (servedBy[who] ?? 0) + 1;
      const c = res.headers.get("x-cache-status");
      if (c) cache[c] = (cache[c] ?? 0) + 1;
    } catch {
      statuses.failed = (statuses.failed ?? 0) + 1;
    }
  }
}

console.log(`\n${TOTAL} requests, ${CONCURRENCY} at a time -> ${URL_}\n`);
const began = performance.now();
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
const seconds = (performance.now() - began) / 1000;

times.sort((a, b) => a - b);
const pct = (p) => times[Math.min(times.length - 1, Math.ceil((p / 100) * times.length) - 1)] ?? 0;
const avg = times.reduce((a, b) => a + b, 0) / (times.length || 1);
const ms = (v) => `${v.toFixed(0).padStart(6)} ms`;

console.log(`  average  ${ms(avg)}   <- the number people quote`);
console.log(`  p50      ${ms(pct(50))}   half of users waited less than this`);
console.log(`  p95      ${ms(pct(95))}`);
console.log(`  p99      ${ms(pct(99))}   1 in 100 users waited longer than this`);
console.log(`  max      ${ms(times.at(-1) ?? 0)}`);
console.log(`\n  throughput  ${(times.length / seconds).toFixed(0)} requests/second`);
console.log(`  status      ${JSON.stringify(statuses)}`);
console.log(`  served by   ${JSON.stringify(servedBy)}`);
if (Object.keys(cache).length) {
  // HIT, STALE and UPDATING were all answered from nginx's copy.
  const fromCache = (cache.HIT ?? 0) + (cache.STALE ?? 0) + (cache.UPDATING ?? 0);
  console.log(`  cache       ${JSON.stringify(cache)}`);
  console.log(`              -> the api answered ${times.length - fromCache} of ${times.length} requests`);
}
console.log();
