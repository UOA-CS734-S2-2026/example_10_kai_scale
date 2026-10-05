import type { EventRepository } from "./event_repository";
import {
  type KaiEvent,
  type NewKaiEvent,
  kaiEventFromJson,
  kaiEventsFromJson,
} from "./kai_event";
import type { KaiUser } from "./kai_user";

const DEFAULT_BASE_URL = "http://localhost:3734";

/**
 * `postEvent` takes flat arguments rather than an input object, and the
 * argument for the portion count is `portions` while the field returned is
 * `portionsLeft`. Check against the server's schema if either changes.
 */
export const DELETE_EVENT_MUTATION = `
  mutation DeleteEvent($id: ID!) {
    deleteEvent(id: $id)
  }
`;

const ME_QUERY = `
  query Me {
    me {
      id
      name
      dept
    }
  }
`;

const POST_EVENT_MUTATION = `
  mutation PostEvent(
    $name: String!
    $location: String!
    $emoji: String!
    $portions: Int!
    $lat: Float!
    $lng: Float!
  ) {
    postEvent(
      name: $name
      location: $location
      emoji: $emoji
      portions: $portions
      lat: $lat
      lng: $lng
    ) {
      id
      name
      location
      emoji
      portionsLeft
      isActive
      lat
      lng
    }
  }
`;

/** Returns the current ID token, or null when nobody is signed in. */
export type TokenSource = () => Promise<string | null>;

/**
 * Talks to the Kai Events server. Reads use the REST routes; writes use the
 * GraphQL mutations.
 *
 * GraphQL requests carry "Authorization: Bearer <ID token>" when someone is
 * signed in. REST reads do not need it; the feed is public.
 *
 * Base URL, fetch and the token source are injectable so tests can supply
 * their own without a mocking library.
 */
export class KaiApiService implements EventRepository {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly getToken: TokenSource;

  constructor(
    baseUrl?: string,
    fetchImpl: typeof fetch = globalThis.fetch,
    getToken: TokenSource = async () => null,
  ) {
    const fromEnv =
      typeof import.meta !== "undefined"
        ? (import.meta.env?.VITE_KAI_SERVER as string | undefined)
        : undefined;
    this.baseUrl = (baseUrl ?? fromEnv ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.fetchImpl = fetchImpl.bind(globalThis);
    this.getToken = getToken;
  }

  private async rest(path: string, init?: RequestInit): Promise<unknown> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, init);
    if (!res.ok) {
      throw new Error(`Could not reach the Kai server (HTTP ${res.status})`);
    }
    return res.json();
  }

  private async graphql<T>(query: string, variables: unknown): Promise<T> {
    // Asked for fresh on every request: the SDK refreshes the token when it
    // is near expiry, so a copy we kept ourselves would eventually go stale.
    const token = await this.getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await this.fetchImpl(`${this.baseUrl}/graphql`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
    });
    // A 401 or 403 still has a useful GraphQL body ("Sign in first."), so
    // read it before deciding the server was unreachable.
    const body = (await res.json().catch(() => ({}))) as {
      data?: T;
      errors?: { message: string }[];
    };
    if (body.errors?.length) throw new Error(body.errors[0].message);
    if (!res.ok) {
      throw new Error(`Could not reach the Kai server (HTTP ${res.status})`);
    }
    // GraphQL answers 200 even when the operation fails, so the errors array
    // has to be checked explicitly.
    if (body.errors?.length) throw new Error(body.errors[0].message);
    if (!body.data) throw new Error("The Kai server returned no data");
    return body.data;
  }

  async fetchEvents(signal?: AbortSignal): Promise<KaiEvent[]> {
    return kaiEventsFromJson(await this.rest("/events", { signal }));
  }

  async fetchEvent(id: string, signal?: AbortSignal): Promise<KaiEvent> {
    return kaiEventFromJson(await this.rest(`/events/${id}`, { signal }));
  }

  async eatPortion(id: string): Promise<KaiEvent> {
    return kaiEventFromJson(
      await this.rest(`/events/${id}/eat`, { method: "POST" }),
    );
  }

  async deleteEvent(id: string): Promise<string | null> {
    const data = await this.graphql<{ deleteEvent: string | null }>(
      DELETE_EVENT_MUTATION,
      { id },
    );
    return data.deleteEvent;
  }

  async fetchMe(): Promise<KaiUser | null> {
    const data = await this.graphql<{ me: KaiUser | null }>(ME_QUERY, {});
    return data.me;
  }

  async postEvent(input: NewKaiEvent): Promise<KaiEvent> {
    const data = await this.graphql<{ postEvent: Record<string, unknown> }>(
      POST_EVENT_MUTATION,
      {
        name: input.name,
        location: input.location,
        emoji: input.emoji,
        portions: input.portionsLeft,
        lat: input.lat,
        lng: input.lng,
      },
    );
    // Who posted it is the server's call now, so the response is the truth
    // and there is nothing to carry across.
    return kaiEventFromJson(data.postEvent);
  }
}
