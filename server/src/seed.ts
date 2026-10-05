// COMPSCI 734 - put the demo data into Firestore.
//
//   npm run seed
//
// Run it whenever you want the six events back at full portions. It uses the
// event and user ids as the DOCUMENT ids and writes with set(), so running it
// twice overwrites rather than duplicating.

import { INITIAL_EVENTS, SEED_ORGANISERS, toDocument } from './data';
import { db, projectId } from './firebase';

async function seed(): Promise<void> {
  // A batch is one round trip and all-or-nothing: either every document lands
  // or none of them does. Ten writes over ten requests is ten chances to end
  // up half seeded.
  const batch = db.batch();

  for (const user of SEED_ORGANISERS) {
    batch.set(db.collection('organisers').doc(user.id), user);
  }

  INITIAL_EVENTS.forEach((event, index) => {
    // toDocument adds isActive and order. See the comment on it in data.ts:
    // both exist because a document is read by clients we do not control, and
    // a collection is not a list.
    batch.set(db.collection('events').doc(event.id), toDocument(event, index));
  });

  await batch.commit();
  console.log(`seeded ${SEED_ORGANISERS.length} organisers, ${INITIAL_EVENTS.length} events into ${projectId}`);
}

seed().catch((error) => {
  console.error('seed failed:', error);
  process.exit(1);
});
