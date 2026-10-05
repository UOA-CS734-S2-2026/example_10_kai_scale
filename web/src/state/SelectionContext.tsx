import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SelectionValue = {
  selectedIds: ReadonlySet<string>;
  isSelected: (id: string) => boolean;
  toggleSelection: (id: string) => void;
  /** Unticks one row, whether or not it was ticked. */
  deselect: (id: string) => void;
  /**
   * Drops any tick whose event no longer exists.
   *
   * A selection is a set of ids, and ids outlive the things they point at. The
   * bar would otherwise count a row nobody can see and total zero portions
   * between them.
   */
  retainOnly: (ids: Iterable<string>) => void;
  clearSelection: () => void;
  selectedCount: number;
};

const SelectionContext = createContext<SelectionValue | null>(null);

/**
 * Which rows the organiser has ticked. Held for the whole screen so the rows
 * and the summary bar read from one source of truth.
 */
export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((previous) => {
      // A new Set, not a mutation: React compares by reference, so changing the
      // existing one in place would not trigger a re-render.
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Unconditional, unlike toggleSelection: calling this twice is the same as
  // calling it once, which matters when it is driven by something other than a
  // person clicking a box.
  const deselect = useCallback((id: string) => {
    setSelectedIds((previous) => {
      if (!previous.has(id)) return previous;
      const next = new Set(previous);
      next.delete(id);
      return next;
    });
  }, []);

  const retainOnly = useCallback((ids: Iterable<string>) => {
    const alive = new Set(ids);
    setSelectedIds((previous) => {
      const next = new Set([...previous].filter((id) => alive.has(id)));
      // Same size means nothing was dropped; returning the old Set keeps React
      // from re-rendering every row on every refetch.
      return next.size === previous.size ? previous : next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const value = useMemo<SelectionValue>(
    () => ({
      selectedIds,
      isSelected: (id: string) => selectedIds.has(id),
      toggleSelection,
      deselect,
      retainOnly,
      clearSelection,
      selectedCount: selectedIds.size,
    }),
    [selectedIds, toggleSelection, deselect, retainOnly, clearSelection],
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection(): SelectionValue {
  const value = useContext(SelectionContext);
  if (!value) throw new Error("useSelection must be used inside a SelectionProvider");
  return value;
}
