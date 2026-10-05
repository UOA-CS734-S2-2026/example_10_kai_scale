import type { KaiEvent } from "../../data/kai_event";
import { useSelection } from "../../state/SelectionContext";

/**
 * Appears once anything is ticked. The portion total is computed from the
 * selection during render rather than tracked alongside it.
 */
export function SelectionBar({
  events,
  onRemoveSelected,
  removing,
}: {
  events: KaiEvent[];
  onRemoveSelected: (events: { id: string; name: string }[]) => void;
  removing: boolean;
}) {
  const { selectedIds, selectedCount, clearSelection } = useSelection();

  if (selectedCount === 0) return null;

  const chosen = events.filter((event) => selectedIds.has(event.id));
  const portions = chosen.reduce((total, event) => total + event.portionsLeft, 0);

  return (
    <div className="selection-bar" role="status">
      <span>
        {`${selectedCount} selected \u00B7 ${portions} portions between them`}
      </span>
      <button
        type="button"
        className="selection-bar__remove"
        disabled={removing}
        onClick={() =>
          onRemoveSelected(chosen.map((e) => ({ id: e.id, name: e.name })))
        }
      >
        {removing
          ? `Removing ${selectedCount}\u2026`
          : `Remove ${selectedCount === 1 ? "this one" : `all ${selectedCount}`}`}
      </button>
      <button type="button" onClick={clearSelection} disabled={removing}>
        Clear
      </button>
    </div>
  );
}
