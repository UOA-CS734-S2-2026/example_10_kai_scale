import type { AuthService, SignedInUser } from "./auth_service";

/** Priya is u1 in the seed data, so the sample events still line up. */
export const PRIYA: SignedInUser = { uid: "u1", name: "Priya", email: "priya@example.com" };

/**
 * The test double. Starts signed in as whoever you pass (or signed out with
 * `null`), and signs in as that same person when asked.
 */
export class FakeAuthService implements AuthService {
  private user: SignedInUser | null;
  private readonly signInAs: SignedInUser;
  private listeners = new Set<(user: SignedInUser | null) => void>();
  /** A made-up token, so tests can check it is sent. Not a real JWT. */
  token = "fake-id-token";

  constructor(user: SignedInUser | null = PRIYA, signInAs: SignedInUser = user ?? PRIYA) {
    this.user = user;
    this.signInAs = signInAs;
  }

  onUserChanged(listener: (user: SignedInUser | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.user);
    return () => this.listeners.delete(listener);
  }

  async signIn(): Promise<void> {
    this.set(this.signInAs);
  }

  async signOut(): Promise<void> {
    this.set(null);
  }

  async getIdToken(): Promise<string | null> {
    return this.user ? this.token : null;
  }

  private set(user: SignedInUser | null) {
    this.user = user;
    for (const listener of this.listeners) listener(user);
  }
}
