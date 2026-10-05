// One greedy user tapping "eat" as fast as they can.
//
//   node scripts/hammer.mjs                     15 eats on free-samosas
//   node scripts/hammer.mjs 5                   5 eats (Demo 2: watch which replica)
//   node scripts/hammer.mjs 30 pizza-night      30 eats on pizza-night
//
// Before step 5 every one succeeds. From step 5 (Demo 4) nginx in web allows a
// small burst, then answers 429 Too Many Requests with a Retry-After header.

const COUNT = Number(process.argv[2] ?? 15);
const EVENT = process.argv[3] ?? "free-samosas";
const url = `http://localhost:8080/api/events/${EVENT}/eat`;

let ok = 0;
let limited = 0;
for (let i = 1; i <= COUNT; i += 1) {
  const res = await fetch(url, { method: "POST" });
  const body = await res.json().catch(() => ({}));
  const retry = res.headers.get("retry-after");
  const who = res.headers.get("x-served-by");
  if (res.status === 200) ok += 1;
  if (res.status === 429) limited += 1;
  const detail = res.status === 200 ? `${body.portionsLeft} left (${who})` : body.error ?? "";
  console.log(`  eat ${String(i).padStart(2)}  ->  ${res.status}  ${detail}${retry ? `  (Retry-After: ${retry}s)` : ""}`);
}
console.log(`\n  ${ok} eaten, ${limited} refused with 429\n`);
