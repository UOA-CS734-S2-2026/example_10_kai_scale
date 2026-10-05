import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { KaiUser } from "../data/kai_user";
import { useRepository } from "./RepositoryContext";

type OrganiserState =
  | { status: "loading" }
  | { status: "organiser"; organiser: KaiUser }
  | { status: "not-organiser" }
  | { status: "error"; message: string };

type OrganiserValue = { state: OrganiserState; recheck: () => void };

const OrganiserContext = createContext<OrganiserValue | null>(null);

/**
 * Asks the server whether the signed-in account is an organiser, once after
 * sign-in and again whenever "Check again" is pressed.
 */
export function OrganiserProvider({ children }: { children: ReactNode }) {
  const repository = useRepository();
  const [state, setState] = useState<OrganiserState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    repository
      .fetchMe()
      .then((me) => {
        if (cancelled) return;
        setState(me ? { status: "organiser", organiser: me } : { status: "not-organiser" });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Could not reach the Kai server",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [repository, attempt]);

  const recheck = useCallback(() => setAttempt((n) => n + 1), []);
  return (
    <OrganiserContext.Provider value={{ state, recheck }}>{children}</OrganiserContext.Provider>
  );
}

export function useOrganiserState(): OrganiserValue {
  const value = useContext(OrganiserContext);
  if (!value) throw new Error("useOrganiserState must be used inside an OrganiserProvider");
  return value;
}

/** For screens that only render once the server has said "organiser". */
export function useOrganiser(): KaiUser {
  const { state } = useOrganiserState();
  if (state.status !== "organiser") {
    throw new Error("useOrganiser used before the server confirmed an organiser");
  }
  return state.organiser;
}
