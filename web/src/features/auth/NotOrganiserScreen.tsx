import { useSignedInUser } from "../../state/AuthContext";
import { useOrganiserState } from "../../state/OrganiserContext";

/**
 * Signed in, but not allowed. The answer to "who are you?" was fine; the
 * answer to "may you post?" was no.
 *
 * The user id is shown so an admin can add it to the organisers collection.
 * In a real app this screen would have a "Request organiser access" button,
 * and an admin would approve the request. That is Thursday's lab.
 */
export function NotOrganiserScreen() {
  const user = useSignedInUser();
  const { recheck } = useOrganiserState();

  return (
    <section className="sign-in not-organiser">
      <h2>You&apos;re signed in, but not an organiser yet</h2>
      <p>
        Signed in as <strong>{user.email ?? user.name}</strong>. Google has
        confirmed who you are. Whether you may post is up to Kai Finder, and
        right now the answer is no.
      </p>
      <p>
        Ask an admin to add this user id to the <code>organisers</code> collection:
      </p>
      <p>
        <code data-testid="uid">{user.uid}</code>
      </p>
      <button type="button" className="primary" onClick={recheck}>
        Check again
      </button>
    </section>
  );
}
