// COMPSCI 734 - the same store, backed by Firestore.
//
// Compare this file with store-memory.ts. Same method names, same arguments,
// same return types, because both are declared as a KaiStore. That is the
// whole trick: rest.ts and every resolver import from store.ts and cannot
// tell which of these two they got.
//
// What genuinely changes is that the data is now DOCUMENTS in COLLECTIONS
// rather than objects in an array, and that phones can read those documents
// without coming through this server at all.

import {
  DECAY_INTERVAL_MS,
  INITIAL_EVENTS,
  SEED_ORGANISERS,
  slugify,
  toDocument,
  type KaiEvent,
  type KaiStore,
  type NewEvent,
  type User,
} from './data';
import { db } from './firebase';

const events = db.collection('events');
// A document here, keyed by Firebase uid, is what makes that account an
// organiser. No document, no permission.
const organisers = db.collection('organisers');

// A collection has no natural order, so ask for one every time. Without this
// Firestore hands documents back sorted by document id, and the feed silently
// reshuffles itself the moment the data moves out of the array.
const inOrder = events.orderBy('order');

// Firestore hands back a plain object with whatever fields the document has.
// Rebuilding the event explicitly does two jobs: it keeps the field order the
// Week 02 clients have always seen, and it means a stray field someone adds
// in the console never leaks into an API response.
function toKaiEvent(data: FirebaseFirestore.DocumentData): KaiEvent {
  return {
    id: data.id,
    name: data.name,
    location: data.location,
    emoji: data.emoji,
    portionsLeft: data.portionsLeft,
    isActive: data.isActive,
    lat: data.lat,
    lng: data.lng,
    postedById: data.postedById,
  };
}

// Every write has to keep isActive true to portionsLeft. In the array version
// isActive was computed on the way out and could not drift; here it is a
// stored field, because the phones read these documents directly and a value
// nobody stores is a value they cannot see. Denormalisation buys the live
// read, and the price is remembering this in every writer.
function eventFields(portionsLeft: number) {
  return { portionsLeft, isActive: portionsLeft > 0 };
}

// Every 15 seconds the food runs out a little more. One read of the
// collection, then ONE batched write for the whole tick: a batch is a single
// round trip, and on the free tier it is also six billed writes instead of
// six requests' worth of overhead.
async function decay(): Promise<void> {
  const snapshot = await inOrder.get();
  const batch = db.batch();
  const changes: string[] = [];

  for (const doc of snapshot.docs) {
    const event = toKaiEvent(doc.data());
    if (event.portionsLeft <= 0) continue;
    const eaten = Math.floor(Math.random() * 3); // 0, 1 or 2
    if (eaten === 0) continue;
    const left = Math.max(0, event.portionsLeft - eaten);
    batch.update(doc.ref, eventFields(left));
    changes.push(`${event.name}: -${eaten} -> ${left}${left === 0 ? ' (all gone)' : ''}`);
  }

  if (changes.length === 0) {
    console.log('decay tick: nothing changed');
    return;
  }

  await batch.commit();
  console.log(`decay tick: ${changes.join(', ')}`);
}

export const store: KaiStore = {
  async events(activeOnly = false): Promise<KaiEvent[]> {
    const snapshot = await inOrder.get();
    const all = snapshot.docs.map((doc) => toKaiEvent(doc.data()));
    // Filtered here rather than with a where clause, on purpose. Firestore
    // indexes each field on its own automatically, but a where on one field
    // COMBINED with an orderBy on another needs a composite index you have to
    // create. Six documents do not justify one.
    return activeOnly ? all.filter((event) => event.isActive) : all;
  },

  async event(id: string): Promise<KaiEvent | undefined> {
    const doc = await events.doc(id).get();
    return doc.exists ? toKaiEvent(doc.data()!) : undefined;
  },

  // Read on every write request rather than cached at startup, so a change in
  // the console applies to the very next request.
  async organiser(uid: string): Promise<User | undefined> {
    const doc = await organisers.doc(uid).get();
    if (!doc.exists) return undefined;
    const data = doc.data()!;
    return { id: doc.id, name: data.name, dept: data.dept };
  },

  // Someone just took one. Read, subtract, write.
  //
  // Two people eating at the same millisecond could both read 12 and both
  // write 11, losing a portion. The fixes are a transaction, which retries
  // on conflict, or FieldValue.increment(-1), which the server applies
  // atomically without reading first. Free food on a campus does not need
  // either; a bank balance does, and it is the same shape of problem.
  async eatPortion(id: string): Promise<KaiEvent | undefined> {
    const ref = events.doc(id);
    const doc = await ref.get();
    if (!doc.exists) return undefined;

    const event = toKaiEvent(doc.data()!);
    const left = Math.max(0, event.portionsLeft - 1);
    await ref.update(eventFields(left));
    console.log(`eat: ${event.name} -> ${left}`);
    return { ...event, ...eventFields(left) };
  },

  // Someone is giving food away. One write, and every phone with the map open
  // sees the pin appear: this method sends nothing to anybody, and there is no
  // list of connected clients anywhere in this codebase.
  async postEvent(event: NewEvent): Promise<KaiEvent> {
    let id = slugify(event.name);
    for (let n = 2; (await events.doc(id).get()).exists; n++) {
      id = `${slugify(event.name)}-${n}`;
    }
    const record = {
      id,
      name: event.name,
      location: event.location,
      emoji: event.emoji,
      portionsLeft: event.portions,
      lat: event.lat,
      lng: event.lng,
      postedById: event.postedById,
    };
    // The seeded six have order 0 to 5, so a timestamp puts anything posted
    // later after all of them, and after each other.
    const document = toDocument(record, Date.now());
    await events.doc(id).set(document);
    console.log(`post: ${record.name} (${id}), ${record.portionsLeft} portions`);
    return toKaiEvent(document);
  },

  // One delete, and every phone with the map open sees the pin vanish.
  // The store does not know who is asking; that decision belongs to the
  // resolver.
  async deleteEvent(id: string): Promise<string | undefined> {
    const ref = events.doc(id);
    const doc = await ref.get();
    if (!doc.exists) return undefined;
    await ref.delete();
    console.log(`delete: ${doc.data()!.name} (${id})`);
    return id;
  },

  // Restore the initial data so the demo can be rerun. Same fixed document
  // ids as the seed script, so this overwrites rather than accumulating.
  async reset(): Promise<KaiEvent[]> {
    const batch = db.batch();
    const seeded = new Set(INITIAL_EVENTS.map((event) => event.id));

    // Anything posted during the last run goes, so reset really does mean
    // "back to the six" rather than "the six, plus whatever we made earlier".
    // A restart used to do this for free, back when the data lived in a
    // variable. Durable data has to be cleaned up on purpose.
    const existing = await events.get();
    for (const doc of existing.docs) {
      if (!seeded.has(doc.id)) batch.delete(doc.ref);
    }

    INITIAL_EVENTS.forEach((event, index) => {
      batch.set(events.doc(event.id), toDocument(event, index));
    });
    // Organisers go back to the four seeds. Anyone added in the console since
    // is removed.
    const seededOrganisers = new Set(SEED_ORGANISERS.map((o) => o.id));
    const existingOrganisers = await organisers.get();
    for (const doc of existingOrganisers.docs) {
      if (!seededOrganisers.has(doc.id)) batch.delete(doc.ref);
    }
    for (const user of SEED_ORGANISERS) {
      batch.set(organisers.doc(user.id), user);
    }
    await batch.commit();
    console.log('reset: back to the initial six events and the four seed organisers');
    return INITIAL_EVENTS.map((event) => toKaiEvent(toDocument(event, 0)));
  },

  startDecay(): void {
    // Not setInterval: a tick that takes longer than the interval would
    // overlap itself and write over its own results. Schedule the next tick
    // only once this one has finished.
    const tick = async (): Promise<void> => {
      try {
        await decay();
      } catch (error) {
        console.error('decay tick failed:', error);
      }
      setTimeout(tick, DECAY_INTERVAL_MS);
    };
    setTimeout(tick, DECAY_INTERVAL_MS);
  },
};

export const STORE_NAME = 'firestore';
