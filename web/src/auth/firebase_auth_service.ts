import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import {
  type Auth,
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import type { AuthService, SignedInUser } from "./auth_service";

/**
 * The Firebase web config. Every value is PUBLIC: Vite compiles VITE_
 * variables into the bundle, and anyone can read them. That is by design.
 * The config says which project to talk to; it grants nothing. What protects
 * the project is the server checking tokens, and the Firestore rules.
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId);

/** Sign-in through Firebase Authentication, with Google as the provider. */
export class FirebaseAuthService implements AuthService {
  private readonly auth: Auth;

  constructor() {
    if (!firebaseConfigured) {
      throw new Error(
        "Firebase is not configured. Copy web/.env.example to web/.env.local and fill it in.",
      );
    }
    // Vite hot reload re-runs modules; initialise the app only once.
    const app: FirebaseApp = getApps()[0] ?? initializeApp(config);
    this.auth = getAuth(app);
  }

  onUserChanged(listener: (user: SignedInUser | null) => void): () => void {
    // Fires once with the restored session (the SDK remembers you across
    // reloads), then on every sign-in and sign-out.
    return onAuthStateChanged(this.auth, (user) =>
      listener(
        user
          ? {
              uid: user.uid,
              name: user.displayName ?? user.email ?? "Signed in",
              email: user.email,
            }
          : null,
      ),
    );
  }

  async signIn(): Promise<void> {
    // A Google popup. Behind it, Firebase runs an OAuth / OpenID Connect
    // sign-in with Google; that provider-flow machinery is hidden from our
    // code. What we get back is a signed-in user with a Firebase ID token
    // for this project.
    await signInWithPopup(this.auth, new GoogleAuthProvider());
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }

  async getIdToken(): Promise<string | null> {
    // Cached, and refreshed by the SDK when it is within five minutes of
    // expiring. Asking every time costs nothing.
    return (await this.auth.currentUser?.getIdToken()) ?? null;
  }
}
