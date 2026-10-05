import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../App";
import { FakeAuthService } from "../../auth/fake_auth_service";
import { FakeEventRepository } from "../../data/fake_event_repository";

function renderApp(repository = new FakeEventRepository()) {
  return render(<App repository={repository} auth={new FakeAuthService()} />);
}

describe("removing one event", () => {
  it("takes the row off screen straight away", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Free samosas");

    await user.click(screen.getByRole("button", { name: "Remove Free samosas" }));

    expect(screen.queryByText("Free samosas")).not.toBeInTheDocument();
    expect(screen.getByText("Sausage sizzle")).toBeInTheDocument();
  });

  it("tells the server which one went", async () => {
    const user = userEvent.setup();
    const repository = new FakeEventRepository();
    renderApp(repository);
    await screen.findByText("Free samosas");

    await user.click(screen.getByRole("button", { name: "Remove Free samosas" }));

    await waitFor(() => expect(repository.deleted).toEqual(["free-samosas"]));
  });

  it("puts the row back when the server refuses", async () => {
    const user = userEvent.setup();
    const repository = new FakeEventRepository();
    renderApp(repository);
    await screen.findByText("Free samosas");

    // Only now, so the first load succeeded and the removal is what fails.
    repository.shouldThrow = true;
    await user.click(screen.getByRole("button", { name: "Remove Free samosas" }));

    // Note what is NOT asserted: that the row vanished before it came back. The
    // fake rejects immediately, so the optimistic window is shorter than an
    // assertion, and catching it mid-flight would pass or fail by machine. The
    // optimism is proved by the first test; this one is about the undo.
    expect(await screen.findByText("Free samosas")).toBeInTheDocument();
  });

  it("says so rather than failing quietly", async () => {
    const user = userEvent.setup();
    const repository = new FakeEventRepository();
    renderApp(repository);
    await screen.findByText("Free samosas");

    repository.shouldThrow = true;
    await user.click(screen.getByRole("button", { name: "Remove Free samosas" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Couldn\u2019t remove/);
    expect(alert).toHaveTextContent(/Free samosas/);
  });

  it("lets the organiser dismiss the failure and carry on", async () => {
    const user = userEvent.setup();
    const repository = new FakeEventRepository();
    renderApp(repository);
    await screen.findByText("Free samosas");

    repository.shouldThrow = true;
    await user.click(screen.getByRole("button", { name: "Remove Free samosas" }));
    await screen.findByRole("alert");

    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("removes from the table view too", async () => {
    const user = userEvent.setup();
    const repository = new FakeEventRepository();
    renderApp(repository);
    await screen.findByText("Free samosas");

    await user.click(screen.getByRole("button", { name: "Table" }));
    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Remove Club barbecue" }));

    expect(
      screen.queryByRole("rowheader", { name: /Club barbecue/ }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(repository.deleted).toEqual(["club-bbq"]));
  });
});

describe("a tick on a row that has gone", () => {
  it("goes with it", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Free samosas");

    await user.click(screen.getByRole("checkbox", { name: "Select Free samosas" }));
    expect(screen.getByText(/1 selected/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove Free samosas" }));

    expect(screen.queryByText("Free samosas")).not.toBeInTheDocument();
    expect(screen.queryByText(/1 selected/)).not.toBeInTheDocument();
  });

  it("never claims a selection worth zero portions", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Free samosas");

    await user.click(screen.getByRole("checkbox", { name: "Select Free samosas" }));
    await user.click(screen.getByRole("button", { name: "Remove Free samosas" }));

    expect(screen.queryByText(/0 portions between them/)).not.toBeInTheDocument();
  });

  it("leaves other ticks alone", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Free samosas");

    await user.click(screen.getByRole("checkbox", { name: "Select Free samosas" }));
    await user.click(screen.getByRole("checkbox", { name: "Select Club barbecue" }));

    await user.click(screen.getByRole("button", { name: "Remove Free samosas" }));

    expect(screen.getByText(/1 selected/)).toBeInTheDocument();
  });
});
