import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../App";
import { FakeAuthService } from "../../auth/fake_auth_service";
import { FakeEventRepository } from "../../data/fake_event_repository";

function renderApp(repository = new FakeEventRepository()) {
  return render(<App repository={repository} auth={new FakeAuthService()} />);
}

/** The card titles, top to bottom. */
function cardOrder() {
  return screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
}

describe("sorting the feed", () => {
  it("puts the nearly-empty events first by default", async () => {
    renderApp();
    await screen.findByText("Free samosas");

    // Leftover pizza has 0, then samosas 14, barbecue 22, sizzle 38.
    expect(cardOrder()).toEqual([
      "Leftover pizza",
      "Free samosas",
      "Club barbecue",
      "Sausage sizzle",
    ]);
  });

  it("sorts by name", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Free samosas");

    await user.selectOptions(screen.getByRole("combobox", { name: /sort by/i }), "name");

    expect(cardOrder()).toEqual([
      "Club barbecue",
      "Free samosas",
      "Leftover pizza",
      "Sausage sizzle",
    ]);
  });

  it("sorts by organiser", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Free samosas");

    await user.selectOptions(screen.getByRole("combobox", { name: /sort by/i }), "organiser");

    // u1 through u4, in that order.
    expect(cardOrder()).toEqual([
      "Free samosas",
      "Sausage sizzle",
      "Club barbecue",
      "Leftover pizza",
    ]);
  });

  it("sorts the table as well as the cards", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Free samosas");

    await user.selectOptions(screen.getByRole("combobox", { name: /sort by/i }), "name");
    await user.click(screen.getByRole("button", { name: "Table" }));
    await screen.findByRole("table");

    const rows = screen.getAllByRole("rowheader").map((h) => h.textContent?.trim());
    expect(rows?.[0]).toContain("Club barbecue");
    expect(rows?.[3]).toContain("Sausage sizzle");
  });

  it("keeps the order when the view changes", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Free samosas");

    await user.selectOptions(screen.getByRole("combobox", { name: /sort by/i }), "name");
    await user.click(screen.getByRole("button", { name: "Table" }));
    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Cards" }));

    expect(cardOrder()).toEqual([
      "Club barbecue",
      "Free samosas",
      "Leftover pizza",
      "Sausage sizzle",
    ]);
  });

  it("does not disturb the list the hook is holding", async () => {
    const user = userEvent.setup();
    const repository = new FakeEventRepository();
    const before = [...repository.events];
    renderApp(repository);
    await screen.findByText("Free samosas");

    await user.selectOptions(screen.getByRole("combobox", { name: /sort by/i }), "name");

    // Sorting the rendered list must not reorder the repository's own array.
    expect(repository.events).toEqual(before);
  });
});
