import type { KaiEvent } from "../../data/kai_event";
import { RowCheckbox } from "./RowCheckbox";

/**
 * The same events as the cards, as rows you can scan down.
 *
 * Nothing about loading, filtering or selection lives here: `FeedScreen` has
 * already decided which events are visible, and `RowCheckbox` reads the
 * selection out of context rather than taking it as a prop. That is what makes
 * a tick survive a switch between views without either view knowing about the
 * other.
 *
 * A real `<table>` rather than a grid of divs, so that a screen reader
 * announces the column a cell belongs to, and so that tests can find things by
 * `columnheader` and `rowheader`.
 */
export function KaiEventTable({
  events,
  onRemove,
}: {
  events: KaiEvent[];
  onRemove: (id: string, name: string) => void;
}) {
  return (
    <table className="table">
      <caption className="visually-hidden">
        Events, as a table: name, location and portions left
      </caption>
      <thead>
        <tr>
          <th scope="col">
            <span className="visually-hidden">Select</span>
          </th>
          <th scope="col">Event</th>
          <th scope="col">Location</th>
          <th scope="col">Portions</th>
          <th scope="col">
            <span className="visually-hidden">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {events.map((event) => (
          <tr key={event.id}>
            <td>
              <RowCheckbox eventId={event.id} eventName={event.name} />
            </td>
            <th scope="row">
              <span aria-hidden="true">{event.emoji} </span>
              {event.name}
            </th>
            <td>{event.location}</td>
            {/* Same wording as the card: "0 portions left" reads like a bug. */}
            <td>{event.isActive ? event.portionsLeft : "All gone"}</td>
            <td>
              <button
                type="button"
                className="link"
                aria-label={`Remove ${event.name}`}
                onClick={() => onRemove(event.id, event.name)}
              >
                Remove
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
