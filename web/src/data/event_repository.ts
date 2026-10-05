import type { KaiEvent, NewKaiEvent } from "./kai_event";
import type { KaiUser } from "./kai_user";

/**
 * Everything the UI is allowed to ask for. Implemented by KaiApiService against
 * the real server, and by FakeEventRepository in tests.
 */
export interface EventRepository {
  fetchEvents(signal?: AbortSignal): Promise<KaiEvent[]>;
  fetchEvent(id: string, signal?: AbortSignal): Promise<KaiEvent>;
  eatPortion(id: string): Promise<KaiEvent>;
  postEvent(input: NewKaiEvent): Promise<KaiEvent>;

  /**
   * Takes a listing down, and resolves to the id that went.
   *
   * `null` means there was nothing there, which is not a failure: an organiser
   * removing an event that already finished is late, not wrong. A rejection
   * means the server could not be reached, and that one the UI has to undo.
   */
  deleteEvent(id: string): Promise<string | null>;

  /**
   * The organiser profile of whoever is signed in, or null if they are not
   * an organiser. The server answers this from its own data.
   */
  fetchMe(): Promise<KaiUser | null>;
}
