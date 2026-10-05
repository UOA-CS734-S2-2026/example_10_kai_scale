// COMPSCI 734 - the in-memory store.
//
// Everything lives in one array, so everything is forgotten whenever the
// process restarts.

import {
  DECAY_INTERVAL_MS,
  buildEvents,
  slugify,
  toEvent,
  SEED_ORGANISERS,
  type EventRecord,
  type KaiEvent,
  type KaiStore,
  type NewEvent,
  type User,
} from './data';

// The single source of truth.
let events: EventRecord[] = buildEvents();

// Every 15 seconds the food runs out a little more, so a client that re-fetches
// visibly sees the numbers fall and events die during a single lecture.
function decay(): void {
  const changes: string[] = [];
  for (const event of events) {
    if (event.portionsLeft <= 0) continue;
    const eaten = Math.floor(Math.random() * 3); // 0, 1 or 2
    if (eaten === 0) continue;
    event.portionsLeft = Math.max(0, event.portionsLeft - eaten);
    changes.push(
      `${event.name}: -${eaten} -> ${event.portionsLeft}${event.portionsLeft === 0 ? ' (all gone)' : ''}`,
    );
  }
  console.log(
    changes.length === 0 ? 'decay tick: nothing changed' : `decay tick: ${changes.join(', ')}`,
  );
}

// Everything that reads or writes the data goes through here, so REST and
// GraphQL are demonstrably serving the same thing.
export const store: KaiStore = {
  async events(activeOnly = false): Promise<KaiEvent[]> {
    const visible = activeOnly ? events.filter((e) => e.portionsLeft > 0) : events;
    return visible.map(toEvent);
  },

  async event(id: string): Promise<KaiEvent | undefined> {
    const event = events.find((e) => e.id === id);
    return event && toEvent(event);
  },

  async organiser(uid: string): Promise<User | undefined> {
    return SEED_ORGANISERS.find((u) => u.id === uid);
  },

  // Someone just took one.
  async eatPortion(id: string): Promise<KaiEvent | undefined> {
    const event = events.find((e) => e.id === id);
    if (!event) return undefined;
    event.portionsLeft = Math.max(0, event.portionsLeft - 1);
    console.log(`eat: ${event.name} -> ${event.portionsLeft}`);
    return toEvent(event);
  },

  // Someone is giving food away.
  async postEvent(event: NewEvent): Promise<KaiEvent> {
    let id = slugify(event.name);
    for (let n = 2; events.some((e) => e.id === id); n++) {
      id = `${slugify(event.name)}-${n}`;
    }
    const record: EventRecord = {
      id,
      name: event.name,
      location: event.location,
      emoji: event.emoji,
      portionsLeft: event.portions,
      lat: event.lat,
      lng: event.lng,
      postedById: event.postedById,
    };
    events.push(record);
    console.log(`post: ${record.name} (${record.id}), ${record.portionsLeft} portions`);
    return toEvent(record);
  },

  // Someone is taking a listing down.
  async deleteEvent(id: string): Promise<string | undefined> {
    const index = events.findIndex((e) => e.id === id);
    if (index === -1) return undefined;
    const [removed] = events.splice(index, 1);
    console.log(`delete: ${removed.name} (${removed.id})`);
    return removed.id;
  },

  // Restore the initial data so the demo can be rerun without restarting.
  async reset(): Promise<KaiEvent[]> {
    events = buildEvents();
    console.log('reset: back to the initial six events');
    return events.map(toEvent);
  },

  startDecay(): void {
    setInterval(decay, DECAY_INTERVAL_MS);
  },
};

export const STORE_NAME = 'memory';
