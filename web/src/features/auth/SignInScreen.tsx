import { useState } from "react";
import { useAuth } from "../../state/AuthContext";

/**
 * The whole sign-in UI. One button, and no register page: the first time
 * someone signs in with Google, Firebase creates their account.
 */
export function SignInScreen() {
  const { service } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setBusy(true);
    setError(null);
    try {
      await service.signIn();
    } catch (err) {
      // Closing the popup lands here too, which is not really an error.
      setError(err instanceof Error ? err.message : "Sign-in did not complete.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="sign-in">
      <h2>Organisers, sign in</h2>
      <p>
        Posting and removing events needs a signed-in organiser. Collectors
        using the phone app do not need an account.
      </p>
      <button type="button" className="primary" onClick={handleSignIn} disabled={busy}>
        {busy ? "Waiting for Google\u2026" : "Sign in with Google"}
      </button>
      {error && (
        <p className="state state--error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
