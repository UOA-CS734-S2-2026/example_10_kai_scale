import { useCallback, useState } from "react";
import { useRepository } from "../state/RepositoryContext";

/**
 * Removing events, optimistically.
 *
 * The organiser is standing next to an empty tray. They click Remove and the
 * row should go now, not in three hundred milliseconds, because the thing they
 * are telling us is already true in the world.
 *
 * So the row is hidden first and the request goes out afterwards. If the server
 * refuses, the row comes back and we say so. That is the bargain: a UI that is
 * usually right and immediately responsive, in exchange for being honest on the
 * rare occasion it guessed wrong.
 *
 * `removed` is a set of ids rather than a filtered copy of the list. The feed
 * refetches, filters and sorts constantly, and a second copy of the data would
 * be a second thing to keep in step.
 */
export type Removal = {
  removed: Set<string>;
  failed: string[];
  /** The server's reason for the first refusal, e.g. "Only the organiser who posted this event can remove it." */
  failureReason: string | null;
  /** True while a batch is in flight, so the button can say so. */
  removing: boolean;
  remove: (id: string, name: string) => void;
  removeMany: (events: { id: string; name: string }[]) => void;
  dismissFailure: () => void;
};

export function useRemoveEvent({
  onRemoved,
  onRemoving,
}: {
  /** Called once the server has confirmed. The feed uses it to refetch. */
  onRemoved?: () => void;
  /**
   * Called the moment a removal starts, before the request.
   *
   * The feed uses this to drop the event out of the selection: a tick left
   * behind on a row that is no longer on screen makes the selection bar count
   * something nobody can see.
   */
  onRemoving?: (id: string) => void;
} = {}): Removal {
  const repository = useRepository();
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState<string[]>([]);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const hide = useCallback(
    (ids: string[]) => {
      setRemoved((current) => {
        const next = new Set(current);
        for (const id of ids) next.add(id);
        return next;
      });
      for (const id of ids) onRemoving?.(id);
    },
    [onRemoving],
  );

  const unhide = useCallback((ids: string[]) => {
    setRemoved((current) => {
      const next = new Set(current);
      for (const id of ids) next.delete(id);
      return next;
    });
  }, []);

  const removeMany = useCallback(
    (events: { id: string; name: string }[]) => {
      if (events.length === 0) return;
      setFailed([]);
      setFailureReason(null);
      setRemoving(true);
      // Gone from the screen before the requests have left the building.
      hide(events.map((e) => e.id));

      // allSettled, not all: `all` rejects on the first failure and abandons
      // the rest, so eight successful removals would be thrown away because the
      // ninth timed out. Every request gets to finish and report for itself.
      Promise.allSettled(
        events.map((e) => repository.deleteEvent(e.id)),
      ).then((results) => {
        const refused = events.filter((_, i) => results[i].status === "rejected");
        if (refused.length > 0) {
          // The guesses that were wrong, put back. The ticks are not restored
          // with them: coming back from a failed removal still selected would
          // be a surprising place to land.
          unhide(refused.map((e) => e.id));
          setFailed(refused.map((e) => e.name));
          // Show the server's reason for a refusal, not just "it failed".
          const firstRejection = results.find((r) => r.status === "rejected") as
            | PromiseRejectedResult
            | undefined;
          const reason = firstRejection?.reason;
          setFailureReason(reason instanceof Error ? reason.message : null);
        }
        if (refused.length < events.length) onRemoved?.();
        setRemoving(false);
      });
    },
    [repository, hide, unhide, onRemoved],
  );

  /**
   * One event is a batch of one.
   *
   * Task 3 had this the other way round, with `remove` doing the work. Once the
   * selection bar needed to remove eleven at a time, keeping two code paths
   * that had to agree about optimism, rollback and failure reporting was the
   * worse of the two options.
   */
  const remove = useCallback(
    (id: string, name: string) => removeMany([{ id, name }]),
    [removeMany],
  );

  const dismissFailure = useCallback(() => {
    setFailed([]);
    setFailureReason(null);
  }, []);

  return { removed, failed, failureReason, removing, remove, removeMany, dismissFailure };
}
