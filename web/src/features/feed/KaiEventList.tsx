import type { KaiEvent } from "../../data/kai_event";
import { KaiEventCard } from "./KaiEventCard";

export function KaiEventList({
  events,
  onRemove,
}: {
  events: KaiEvent[];
  onRemove: (id: string, name: string) => void;
}) {
  return (
    <div className="list">
      {/* Keyed by id, not by array position: events drop out of the list as
          their portions run out, which would shift every index-based key. */}
      {events.map((event) => (
        <KaiEventCard key={event.id} event={event} onRemove={onRemove} />
      ))}
    </div>
  );
}
