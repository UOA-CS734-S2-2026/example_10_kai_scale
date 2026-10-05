import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../App";
import { FakeAuthService } from "../../auth/fake_auth_service";
import { FakeEventRepository } from "../../data/fake_event_repository";

function renderApp(repository = new FakeEventRepository()) {
  return render(<App repository={repository} auth={new FakeAuthService()} />);
}

async function tick(user: ReturnType<typeof userEvent.setup>, ...names: string[]) {
  for (const name of names) {
    await user.click(screen.getByRole("checkbox", { name: `Select ${name}` }));
  }
}

describe("removing several at once", () => {
  it("offers to remove everything ticked", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Free samosas");

    await tick(user, "Free samosas", "Club barbecue");

    expect(screen.getByRole("button", { name: "Remove all 2" })).toBeInTheDocument();
  });

  it("says this one rather than all 1", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Free samosas");

    await tick(user, "Free samosas");

    expect(screen.getByRole("button", { name: "Remove this one" })).toBeInTheDocument();
  });

  it("removes all of them, and clears the bar", async () => {
    const user = userEvent.setup();
    const repository = new FakeEventRepository();
    renderApp(repository);
    await screen.findByText("Free samosas");

    await tick(user, "Free samosas", "Club barbecue", "Sausage sizzle");
    await user.click(screen.getByRole("button", { name: "Remove all 3" }));

    expect(screen.queryByText("Free samosas")).not.toBeInTheDocument();
    expect(screen.queryByText("Club barbecue")).not.toBeInTheDocument();
    expect(screen.queryByText("Sausage sizzle")).not.toBeInTheDocument();
    // Ticks went with their rows, so the bar has nothing left to count.
    await waitFor(() => expect(screen.queryByText(/selected/)).not.toBeInTheDocument());
    await waitFor(() =>
      expect([...repository.deleted].sort()).toEqual([
        "club-bbq",
        "free-samosas",
        "sausage-sizzle",
      ]),
    );
  });

  it("keeps the ones that went, and puts back the ones that did not", async () => {
    const user = userEvent.setup();
    const repository = new FakeEventRepository();
    // One request in the batch fails. Promise.all would have abandoned the
    // other two; allSettled lets each report for itself.
    repository.refuseToDelete.add("club-bbq");
    renderApp(repository);
    await screen.findByText("Free samosas");

    await tick(user, "Free samosas", "Club barbecue", "Sausage sizzle");
    await user.click(screen.getByRole("button", { name: "Remove all 3" }));

    // Two gone...
    await waitFor(() =>
      expect(screen.queryByText("Free samosas")).not.toBeInTheDocument(),
    );
    expect(screen.queryByText("Sausage sizzle")).not.toBeInTheDocument();
    // ...and the refused one is back on screen.
    expect(await screen.findByText("Club barbecue")).toBeInTheDocument();
  });

  it("says how many it could not remove", async () => {
    const user = userEvent.setup();
    const repository = new FakeEventRepository();
    repository.refuseToDelete.add("club-bbq");
    repository.refuseToDelete.add("free-samosas");
    renderApp(repository);
    await screen.findByText("Free samosas");

    await tick(user, "Free samosas", "Club barbecue", "Sausage sizzle");
    await user.click(screen.getByRole("button", { name: "Remove all 3" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Couldn\u2019t remove 2 events/);
  });

  it("sends one request per event", async () => {
    const user = userEvent.setup();
    const repository = new FakeEventRepository();
    renderApp(repository);
    await screen.findByText("Free samosas");

    await tick(user, "Free samosas", "Club barbecue");
    await user.click(screen.getByRole("button", { name: "Remove all 2" }));

    await waitFor(() => expect(repository.deleted).toHaveLength(2));
  });
});
