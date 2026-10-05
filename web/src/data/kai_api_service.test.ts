import { describe, expect, it } from "vitest";
import { KaiApiService } from "./kai_api_service";

type Captured = { url: string; init: RequestInit };

/** A fetch that records what it was asked and answers with `reply`. */
function recordingFetch(reply: { status?: number; body: unknown }) {
  const calls: Captured[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(reply.body), { status: reply.status ?? 200 });
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

const newEvent = {
  name: "Kai bowls",
  location: "The quad",
  emoji: "\u{1F372}",
  portionsLeft: 20,
  lat: -36.85,
  lng: 174.76,
};

const created = { id: "kai-bowls", ...newEvent, isActive: true };

describe("KaiApiService and the ID token", () => {
  it("sends the token as a Bearer header on writes", async () => {
    const { calls, fetchImpl } = recordingFetch({ body: { data: { postEvent: created } } });
    const api = new KaiApiService("http://kai", fetchImpl, async () => "the-token");

    await api.postEvent(newEvent);

    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer the-token");
  });

  it("never sends a postedById: the server decides who posted", async () => {
    const { calls, fetchImpl } = recordingFetch({ body: { data: { postEvent: created } } });
    const api = new KaiApiService("http://kai", fetchImpl, async () => "the-token");

    await api.postEvent(newEvent);

    expect(String(calls[0].init.body)).not.toContain("postedById");
  });

  it("sends no Authorization header when nobody is signed in", async () => {
    const { calls, fetchImpl } = recordingFetch({ body: { data: { postEvent: created } } });
    const api = new KaiApiService("http://kai", fetchImpl, async () => null);

    await api.postEvent(newEvent);

    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("surfaces the server's reason on a 401 instead of 'could not reach'", async () => {
    const { fetchImpl } = recordingFetch({
      status: 401,
      body: { errors: [{ message: "Sign in first." }] },
    });
    const api = new KaiApiService("http://kai", fetchImpl, async () => null);

    await expect(api.postEvent(newEvent)).rejects.toThrow("Sign in first.");
  });
});
