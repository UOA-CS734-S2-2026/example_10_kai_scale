import { useEffect, useState } from "react";
import { useEvents } from "../../hooks/useEvents";
import { useRemoveEvent } from "../../hooks/useRemoveEvent";
import { useSelection } from "../../state/SelectionContext";
import type { KaiEvent } from "../../data/kai_event";
import { SelectionBar } from "./SelectionBar";
import { useSignedInUser } from "../../state/AuthContext";
import { KaiEventList } from "./KaiEventList";
import { KaiEventTable } from "./KaiEventTable";

type SortKey = "portions" | "name" | "organiser";

/**
 * One comparator per order, kept out of the JSX.
 *
 * Portions ascending, not descending: the question an organiser has is which of
 * their events is about to run out, so the nearly-empty ones belong where the
 * eye lands first. "All gone" sorts to the very top, which is right - those are
 * the ones to take down.
 */
const comparators: Record<SortKey, (a: KaiEvent, b: KaiEvent) => number> = {
  portions: (a, b) => a.portionsLeft - b.portionsLeft,
  name: (a, b) => a.name.localeCompare(b.name),
  organiser: (a, b) => (a.postedById ?? "").localeCompare(b.postedById ?? ""),
};

/**
 * The event feed, covering all four states a remote read can be in: loading,
 * error, empty and data.
 */
export function FeedScreen() {
  const { events, error, loading, reload } = useEvents();
  const user = useSignedInUser();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"mine" | "all">("all");
  // Which way the same events are drawn. Nothing else depends on it, which is
  // why it is local state rather than anything grander.
  const [view, setView] = useState<"cards" | "table">("cards");
  const [sort, setSort] = useState<SortKey>("portions");

  const { deselect, retainOnly } = useSelection();
  const { removed, failed, failureReason, removing, remove, removeMany, dismissFailure } =
    useRemoveEvent({
      onRemoved: reload,
      onRemoving: deselect,
    });

  // Whatever the server says exists is what may stay ticked. This runs on every
  // load, so a tick cannot outlive its event however it went.
  useEffect(() => {
    if (events) retainOnly(events.map((event) => event.id));
  }, [events, retainOnly]);

  // Derived during render rather than held in state, so there is only ever one
  // source of truth for what is on screen.
  const visible = (events ?? [])
    // Optimistically removed rows drop out here, alongside every other filter,
    // so there is still only one source of truth for what is on screen.
    .filter((event) => !removed.has(event.id))
    .filter((event) => scope === "all" || event.postedById === user.uid)
    .filter((event) =>
      `${event.name} ${event.location}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    )
    // Safe to sort in place: .filter() has already handed us a new array, so
    // this is not the one useEvents is holding. Sorting that one would mutate
    // state React believes it owns.
    .sort(comparators[sort]);

  return (
    <section>
      <header className="screen__header">
        <h2>Events</h2>
      </header>

      <div className="scope" role="group" aria-label="View as">
        <button
          type="button"
          aria-pressed={view === "cards"}
          onClick={() => setView("cards")}
        >
          Cards
        </button>
        <button
          type="button"
          aria-pressed={view === "table"}
          onClick={() => setView("table")}
        >
          Table
        </button>
      </div>

      <div className="scope" role="group" aria-label="Which events">
        <button
          type="button"
          aria-pressed={scope === "mine"}
          onClick={() => setScope("mine")}
        >
          My events
        </button>
        <button
          type="button"
          aria-pressed={scope === "all"}
          onClick={() => setScope("all")}
        >
          All events
        </button>
      </div>

      <label className="sort">
        <span>Sort by</span>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="portions">Portions left</option>
          <option value="name">Name</option>
          <option value="organiser">Organiser</option>
        </select>
      </label>

      <label className="search">
        <span className="search__label">Search events</span>
        <input
          type="search"
          value={query}
          placeholder="samosas, quad, ..."
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      {loading && (
        <div className="skeleton" role="status" aria-live="polite">
          <span className="visually-hidden">Loading events</span>
          <div className="skeleton__row" />
          <div className="skeleton__row" />
          <div className="skeleton__row" />
        </div>
      )}

      {failed.length > 0 && (
        <div className="state state--error" role="alert">
          <p>
            {failed.length === 1
              ? `Couldn\u2019t remove \u201C${failed[0]}\u201D. It is still listed.`
              : `Couldn\u2019t remove ${failed.length} events. They are still listed.`}
          </p>
          {failureReason && <p className="state__reason">{failureReason}</p>}
          <button type="button" onClick={dismissFailure}>
            Dismiss
          </button>
        </div>
      )}

      {!loading && error && (
        <div className="state state--error" role="alert">
          <p>Couldn&rsquo;t reach the Kai server.</p>
          <p className="state__hint">
            Check it is running on port 3734, then try again.
          </p>
          <button type="button" onClick={reload}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className="state state--empty">
          {/* Three ways to be empty, and they mean different things. */}
          {query ? (
            <p>{`No events match \u201C${query}\u201D.`}</p>
          ) : scope === "mine" ? (
            <>
              <p>{`${user.name} hasn\u2019t posted anything yet.`}</p>
              <p className="state__hint">
                Post an event, or switch to All events to see the rest of campus.
              </p>
            </>
          ) : (
            <>
              <p>No free kai on campus right now.</p>
              <p className="state__hint">Post an event to let everyone know.</p>
            </>
          )}
        </div>
      )}

      <SelectionBar
        events={visible}
        onRemoveSelected={removeMany}
        removing={removing}
      />

      {!loading && !error && visible.length > 0 &&
        (view === "table" ? (
          <KaiEventTable events={visible} onRemove={remove} />
        ) : (
          <KaiEventList events={visible} onRemove={remove} />
        ))}
    </section>
  );
}
