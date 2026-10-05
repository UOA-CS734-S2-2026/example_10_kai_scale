/**
 * Who is signed in, as far as the dashboard is concerned.
 *
 * `uid` is Firebase's id for the account: a long random string, stable for the
 * life of the account, the same whichever device signs in. It is what the
 * server keys everything on.
 */
export type SignedInUser = {
  uid: string;
  name: string;
  email: string | null;
};

/**
 * Everything the UI is allowed to ask about sign-in.
 *
 * Implemented by FirebaseAuthService against Google, and by FakeAuthService in
 * tests. The same seam as EventRepository, for the same reason: the tests
 * should never need a network, a Google account or a browser popup.
 */
export interface AuthService {
  /**
   * Calls `listener` now-ish with the current user (or null), and again every
   * time that changes. Returns the unsubscribe function, for a useEffect.
   */
  onUserChanged(listener: (user: SignedInUser | null) => void): () => void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  /**
   * The current Firebase ID token: a signed JWT, valid for about an hour.
   * The SDK refreshes it quietly when it is close to expiry, so ask for it
   * every time rather than keeping your own copy.
   */
  getIdToken(): Promise<string | null>;
}
