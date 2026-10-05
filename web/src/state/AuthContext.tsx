import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthService, SignedInUser } from "../auth/auth_service";
import { FirebaseAuthService } from "../auth/firebase_auth_service";

type AuthValue = {
  service: AuthService;
  /** undefined while Firebase is still restoring the session on page load. */
  user: SignedInUser | null | undefined;
};

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Replaces Week 07's OrganiserProvider. That one held a value the user CHOSE
 * from a dropdown; this one holds whatever Firebase says after a real sign-in.
 *
 * Passing `service` swaps in a fake, which is how every test runs.
 */
export function AuthProvider({
  service,
  children,
}: {
  service?: AuthService;
  children: ReactNode;
}) {
  const auth = useMemo(() => service ?? new FirebaseAuthService(), [service]);
  const [user, setUser] = useState<SignedInUser | null | undefined>(undefined);

  useEffect(() => auth.onUserChanged(setUser), [auth]);

  const value = useMemo(() => ({ service: auth, user }), [auth, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside an AuthProvider");
  return value;
}

/**
 * For screens that only ever render once someone is signed in. The gate in
 * App.tsx guarantees it, so these screens need not handle null.
 */
export function useSignedInUser(): SignedInUser {
  const { user } = useAuth();
  if (!user) throw new Error("useSignedInUser used outside the signed-in part of the app");
  return user;
}
