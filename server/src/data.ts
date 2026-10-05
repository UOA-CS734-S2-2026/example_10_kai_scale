// COMPSCI 734 - Kai Events server, v3: the data model, the seed, and the
// contract every store implements.
//
// What the data is lives here; where it is kept lives in store-memory.ts and
// store-firestore.ts, and store.ts picks one.

export type User = {
  id: string;
  name: string;
  dept: string;
};

// What an in-memory event record holds. Note the absence of isActive.
export type EventRecord = {
  id: string;
  name: string;
  location: string;
  emoji: string;
  portionsLeft: number;
  lat: number;
  lng: number;
  postedById: string;
};

// What the store hands out, and what both REST and GraphQL serve. Named
// KaiEvent rather than Event because Node already has a global Event, and
// because that is what the Flutter client calls it.
export type KaiEvent = EventRecord & { isActive: boolean };

// The contract. Both stores are declared as a KaiStore, so if the Firestore
// version drifts from the in-memory one the compiler says so rather than the
// demo saying so. This is what makes swapping them a one-line change in
// store.ts rather than a hopeful one.
//
// Every method returns a Promise, including the in-memory implementation that
// has nothing to wait for. A database is a conversation across a network, and
// a seam that pretends otherwise has to be rebuilt the day a real one arrives.
export type KaiStore = {
  events(activeOnly?: boolean): Promise<KaiEvent[]>;
  event(id: string): Promise<KaiEvent | undefined>;
  // The organiser profile for a Firebase uid, or undefined if that account is
  // not an organiser.
  organiser(uid: string): Promise<User | undefined>;
  eatPortion(id: string): Promise<KaiEvent | undefined>;
  postEvent(event: NewEvent): Promise<KaiEvent>;
  // Resolves to the id that went, or undefined if there was nothing there.
  deleteEvent(id: string): Promise<string | undefined>;
  reset(): Promise<KaiEvent[]>;
  startDecay(): void;
};

// What a caller supplies to post kai. No id, because the store makes that,
// and portions rather than portionsLeft, because at the moment of posting
// they are the same number and only one of them is a fact about the world.
export type NewEvent = {
  name: string;
  location: string;
  emoji: string;
  portions: number;
  lat: number;
  lng: number;
  postedById: string;
};

// A readable document id, made from the name: "Kai bowls" becomes "kai-bowls".
// Firestore would happily generate a random one, and a real app would let it;
// these stay readable because they end up in demo URLs and console screenshots.
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'kai'
  );
}

export const DECAY_INTERVAL_MS = 15000;

// Events record who posted them. A feed card that wants to say "Free samosas,
// posted by Priya from Engineering" needs two resources.
// The seed organisers own the six seed events. Their ids are not real Firebase
// uids, so nobody can sign in as them. Real organisers are documents in the
// organisers collection, keyed by Firebase uid.
export const SEED_ORGANISERS: User[] = [
  { id: 'u1', name: 'Priya', dept: 'Engineering' },
  { id: 'u2', name: 'Tama', dept: 'Computer Science' },
  { id: 'u3', name: 'Mei', dept: 'Science' },
  { id: 'u4', name: 'Josh', dept: 'Business School' },
];

// The same six events the Week 02 server serves, unchanged, plus a poster each.
// Coordinates are approximate University of Auckland City Campus positions:
// close enough for a demo map.
export const INITIAL_EVENTS: EventRecord[] = [
  {
    id: 'sausage-sizzle',
    name: 'Sausage sizzle',
    location: 'Engineering courtyard',
    emoji: '🌭',
    portionsLeft: 40,
    lat: -36.8527,
    lng: 174.7666,
    postedById: 'u2',
  },
  {
    id: 'seminar-catering',
    name: 'Seminar catering leftovers',
    location: 'Science Centre 303',
    emoji: '🥪',
    portionsLeft: 15,
    lat: -36.8525,
    lng: 174.7629,
    postedById: 'u3',
  },
  {
    id: 'club-barbecue',
    name: 'Club barbecue',
    location: 'OGGB lawn',
    emoji: '🍖',
    portionsLeft: 60,
    lat: -36.8536,
    lng: 174.77,
    postedById: 'u4',
  },
  {
    id: 'free-samosas',
    name: 'Free samosas',
    location: 'City Campus quad',
    emoji: '🥟',
    portionsLeft: 25,
    lat: -36.8517,
    lng: 174.7687,
    postedById: 'u1',
  },
  {
    id: 'bake-sale',
    name: 'Bake sale seconds',
    location: 'Kate Edger foyer',
    emoji: '🧁',
    portionsLeft: 12,
    lat: -36.8521,
    lng: 174.7694,
    postedById: 'u2',
  },
  {
    id: 'pizza-night',
    name: 'Study group pizza surplus',
    location: 'Leech building level 2',
    emoji: '🍕',
    portionsLeft: 20,
    lat: -36.853,
    lng: 174.768,
    postedById: 'u3',
  },
];

export function buildEvents(): EventRecord[] {
  return INITIAL_EVENTS.map((event) => ({ ...event }));
}

// What an event looks like as a Firestore DOCUMENT, which is not quite what it
// looks like as an API response. Two fields are added here and stripped again
// on the way out:
//
// isActive, because a phone reading this document directly never passes
// through our code, so anything a client needs has to be a real field.
//
// order, because a collection is not a list. Firestore returns documents in
// document-id order unless you ask for something else, so "the order we put
// them in" is not a thing that exists until you store it.
export function toDocument(record: EventRecord, order: number) {
  return { ...record, isActive: record.portionsLeft > 0, order };
}

// isActive derived on the way out, so it cannot drift out of sync with
// portionsLeft. The field order is the Week 02 server's exactly, with
// postedById added on the end: existing clients keep working.
export function toEvent(record: EventRecord): KaiEvent {
  return {
    id: record.id,
    name: record.name,
    location: record.location,
    emoji: record.emoji,
    portionsLeft: record.portionsLeft,
    isActive: record.portionsLeft > 0,
    lat: record.lat,
    lng: record.lng,
    postedById: record.postedById,
  };
}
