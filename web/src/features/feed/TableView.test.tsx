import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../App";
import { FakeAuthService } from "../../auth/fake_auth_service";
import { FakeEventRepository } from "../../data/fake_event_repository";

function renderApp(repository = new FakeEventRepository()) {
  return render(<App repository={repository} auth={new FakeAuthService()} />);
}

describe("the table view", () => {
  it("starts on cards", async () => {
    renderApp();
    await screen.findByText("Free samosas");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("switches to a table with the columns an organiser scans", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Free samosas");

    await user.click(screen.getByRole("button", { name: "Table" }));

    expect(await screen.findByRole("table")).toBeInTheDocument();
    for (const column of ["Event", "Location", "Portions"]) {
      expect(screen.getByRole("columnheader", { name: column })).toBeInTheDocument();
    }
    expect(screen.getByRole("rowheader", { name: /Free samosas/ })).toBeInTheDocument();
  });

  it("says All gone in the table too, rather than 0", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Free samosas");

    await user.click(screen.getByRole("button", { name: "Table" }));
    const row = (await screen.findByRole("rowheader", { name: /Leftover pizza/ })).closest("tr");

    expect(row).toHaveTextContent("All gone");
  });

  it("switches back to cards", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Free samosas");

    await user.click(screen.getByRole("button", { name: "Table" }));
    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Cards" }));

    await waitFor(() => expect(screen.queryByRole("table")).not.toBeInTheDocument());
    expect(screen.getByText("Free samosas")).toBeInTheDocument();
  });

  it("keeps a tick when the view changes", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Free samosas");

    await user.click(screen.getByRole("checkbox", { name: "Select Free samosas" }));
    await user.click(screen.getByRole("checkbox", { name: "Select Club barbecue" }));
    expect(screen.getByText(/2 selected/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Table" }));
    await screen.findByRole("table");

    // The tick lives in context, not in either view, so it survives the switch.
    expect(screen.getByRole("checkbox", { name: "Select Free samosas" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select Club barbecue" })).toBeChecked();
    expect(screen.getByText(/2 selected/)).toBeInTheDocument();
  });

  it("can be ticked in the table and seen on the cards", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Free samosas");
    await user.click(screen.getByRole("button", { name: "Table" }));
    await screen.findByRole("table");

    await user.click(screen.getByRole("checkbox", { name: "Select Sausage sizzle" }));
    await user.click(screen.getByRole("button", { name: "Cards" }));

    await waitFor(() => expect(screen.queryByRole("table")).not.toBeInTheDocument());
    expect(screen.getByRole("checkbox", { name: "Select Sausage sizzle" })).toBeChecked();
  });
});
