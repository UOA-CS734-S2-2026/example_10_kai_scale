import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../App";
import { FakeAuthService } from "../../auth/fake_auth_service";
import { FakeEventRepository } from "../../data/fake_event_repository";

describe("removing someone else's event", () => {
  it("puts the event back and says why the server refused", async () => {
    const user = userEvent.setup();
    const repository = new FakeEventRepository();
    // Tama (u2) posted the sausage sizzle; Priya is signed in.
    repository.refuseToDelete.add("sausage-sizzle");
    render(<App repository={repository} auth={new FakeAuthService()} />);
    await screen.findByText("Sausage sizzle");

    await user.click(screen.getByRole("button", { name: "Remove Sausage sizzle" }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(/only the organiser who posted/i)).toBeInTheDocument();
    // The Lab 05 rollback, firing for a real reason at last.
    expect(await screen.findByText("Sausage sizzle")).toBeInTheDocument();
  });
});
