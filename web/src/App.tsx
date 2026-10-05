import { useState, type ReactNode } from "react";
import { FeedScreen } from "./features/feed/FeedScreen";
import { PostEventScreen } from "./features/post/PostEventScreen";
import { AccountBar } from "./features/auth/AccountBar";
import { SignInScreen } from "./features/auth/SignInScreen";
import { TokenPeek } from "./features/auth/TokenPeek";
import { NotOrganiserScreen } from "./features/auth/NotOrganiserScreen";
import { OrganiserProvider, useOrganiserState } from "./state/OrganiserContext";
import { SelectionProvider } from "./state/SelectionContext";
import { AuthProvider, useAuth } from "./state/AuthContext";
import { RepositoryProvider } from "./state/RepositoryContext";
import type { EventRepository } from "./data/event_repository";
import type { AuthService } from "./auth/auth_service";

/**
 * `repository` and `auth` are both optional: tests pass fakes, the app leaves
 * them undefined and gets the real server and real Firebase.
 */
export function App({
  repository,
  auth,
}: { repository?: EventRepository; auth?: AuthService } = {}) {
  return (
    <AuthProvider service={auth}>
      <RepositoryProvider repository={repository}>
        <div className="app">
          <header className="app__bar">
            <h1>Kai Finder {"\u00B7"} Organiser</h1>
            <SignedInOnly>
              <AccountBar />
            </SignedInOnly>
          </header>
          <Gate />
        </div>
      </RepositoryProvider>
    </AuthProvider>
  );
}

function SignedInOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : null;
}

/**
 * The gate. Signed out: the sign-in screen. Signed in: the dashboard.
 *
 * A convenience, not a security boundary: anyone can call the server directly.
 */
function Gate() {
  const { user } = useAuth();
  if (user === undefined) {
    return <main className="app__main"><p className="state">Checking who you are{"\u2026"}</p></main>;
  }
  if (user === null) {
    return <main className="app__main"><SignInScreen /></main>;
  }
  // Keyed by uid, so signing in as someone else asks the server afresh.
  return (
    <OrganiserProvider key={user.uid}>
      <OrganiserGate />
    </OrganiserProvider>
  );
}

/**
 * Signed in is not the same as allowed. The server's `me` query decides which
 * screen you see; the server still refuses the write whatever this shows.
 */
function OrganiserGate() {
  const { state, recheck } = useOrganiserState();
  if (state.status === "loading") {
    return <main className="app__main"><p className="state">Checking you are an organiser{"\u2026"}</p></main>;
  }
  if (state.status === "error") {
    return (
      <main className="app__main">
        <div className="state state--error" role="alert">
          <p>{state.message}</p>
          <button type="button" onClick={recheck}>Try again</button>
        </div>
      </main>
    );
  }
  if (state.status === "not-organiser") {
    return <main className="app__main"><NotOrganiserScreen /></main>;
  }
  return <Dashboard />;
}

function Dashboard() {
  const [screen, setScreen] = useState<"feed" | "post">("feed");
  return (
    <SelectionProvider>
      <div className="token-strip">
        <TokenPeek />
      </div>
      <nav className="tabs" aria-label="Sections">
        <button
          type="button"
          aria-current={screen === "feed" ? "page" : undefined}
          onClick={() => setScreen("feed")}
        >
          Events
        </button>
        <button
          type="button"
          aria-current={screen === "post" ? "page" : undefined}
          onClick={() => setScreen("post")}
        >
          Post
        </button>
      </nav>
      <main className="app__main">
        {screen === "feed" ? <FeedScreen /> : <PostEventScreen />}
      </main>
    </SelectionProvider>
  );
}
