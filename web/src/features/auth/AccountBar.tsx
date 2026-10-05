import { useAuth, useSignedInUser } from "../../state/AuthContext";

/** Replaces the "Acting as" picker: who you ARE, not who you say you are. */
export function AccountBar() {
  const { service } = useAuth();
  const user = useSignedInUser();

  return (
    <div className="account-bar">
      <span>
        Signed in as <strong>{user.name}</strong>
        {user.email ? ` (${user.email})` : ""}
      </span>
      <button type="button" onClick={() => service.signOut()}>
        Sign out
      </button>
    </div>
  );
}
