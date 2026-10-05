import type { EventRepository } from "./event_repository";
import type { KaiEvent, NewKaiEvent } from "./kai_event";
import { ORGANISERS, type KaiUser } from "./kai_user";

/** A trimmed copy of the server's seed data. */
export const sampleEvents: KaiEvent[] = [
  { id: "free-samosas", name: "Free samosas", location: "OGGB Level 2", emoji: "\u{1F95F}", portionsLeft: 14, isActive: true, lat: -36.8523, lng: 174.7691, postedById: "u1" },
  { id: "sausage-sizzle", name: "Sausage sizzle", location: "The Quad", emoji: "\u{1F32D}", portionsLeft: 38, isActive: true, lat: -36.8519, lng: 174.7687, postedById: "u2" },
  { id: "club-bbq", name: "Club barbecue", location: "Symonds St Lawn", emoji: "\u{1F356}", portionsLeft: 22, isActive: true, lat: -36.8531, lng: 174.7702, postedById: "u3" },
  { id: "leftover-pizza", name: "Leftover pizza", location: "Engineering 401", emoji: "\u{1F355}", portionsLeft: 0, isActive: false, lat: -36.8528, lng: 174.7669, postedById: "u4" },
];

/**
 * An in-memory EventRepository for tests. Three knobs cover the states the UI
 * has to handle: data, a rejected promise, and a promise that never settles.
 */
export class FakeEventRepository implements EventRepository {
  events: KaiEvent[];
  shouldThrow = false;
  neverAnswers = false;
  readonly postedEvents: NewKaiEvent[] = [];
  /** Who the fake server says you are. Priya, unless a test says otherwise. */
  me: KaiUser | null = ORGANISERS[0];

  constructor(events: KaiEvent[] = sampleEvents) {
    this.events = [...events];
  }

  private guard<T>(value: T): Promise<T> {
    if (this.neverAnswers) return new Promise<T>(() => {});
    if (this.shouldThrow) {
      return Promise.reject(new Error("Could not reach the Kai server"));
    }
    return Promise.resolve(value);
  }

  fetchEvents(): Promise<KaiEvent[]> {
    return this.guard([...this.events]);
  }

  fetchEvent(id: string): Promise<KaiEvent> {
    const found = this.events.find((e) => e.id === id);
    if (!found) return Promise.reject(new Error(`No event with id ${id}`));
    return this.guard(found);
  }

  eatPortion(id: string): Promise<KaiEvent> {
    const found = this.events.find((e) => e.id === id);
    if (!found) return Promise.reject(new Error(`No event with id ${id}`));
    const portionsLeft = Math.max(0, found.portionsLeft - 1);
    const updated = { ...found, portionsLeft, isActive: portionsLeft > 0 };
    this.events = this.events.map((e) => (e.id === id ? updated : e));
    return this.guard(updated);
  }

  /** Every id the UI asked to remove, in order. */
  readonly deleted: string[] = [];

  /** Ids this fake refuses to delete, for testing a partial failure. */
  refuseToDelete = new Set<string>();

  deleteEvent(id: string): Promise<string | null> {
    // shouldThrow is checked BEFORE the array is touched. Otherwise a "failed"
    // delete still removes the event, and the rollback test passes for the
    // wrong reason.
    if (this.shouldThrow) {
      return Promise.reject(new Error("Could not reach the Kai server"));
    }
    if (this.refuseToDelete.has(id)) {
      // What the real server says when the event is not yours.
      return Promise.reject(
        new Error("Only the organiser who posted this event can remove it."),
      );
    }
    this.deleted.push(id);
    const existed = this.events.some((e) => e.id === id);
    this.events = this.events.filter((e) => e.id !== id);
    return this.guard(existed ? id : null);
  }

  /** Its own knob: the feed's failure states should not also lock the gate. */
  meFails = false;

  fetchMe(): Promise<KaiUser | null> {
    if (this.meFails) return Promise.reject(new Error("Could not reach the Kai server"));
    return Promise.resolve(this.me);
  }

  postEvent(input: NewKaiEvent): Promise<KaiEvent> {
    this.postedEvents.push(input);
    const created: KaiEvent = {
      ...input,
      id: `posted-${this.postedEvents.length}`,
      isActive: input.portionsLeft > 0,
      // The real server fills this in from the token.
      postedById: null,
    };
    this.events = [...this.events, created];
    return this.guard(created);
  }
}
