import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../App";
import { FakeAuthService } from "../../auth/fake_auth_service";
import type { SignedInUser } from "../../auth/auth_service";
import { FakeEventRepository } from "../../data/fake_event_repository";
import { ORGANISERS } from "../../data/kai_user";

async function openPostScreen(repository: FakeEventRepository, signedInAs?: SignedInUser) {
  const user = userEvent.setup();
  render(<App repository={repository} auth={new FakeAuthService(signedInAs)} />);
  // The Post tab appears once the server has confirmed an organiser.
  await user.click(await screen.findByRole("button", { name: "Post" }));
  return user;
}

describe("PostEventScreen", () => {
  it("refuses to submit without an event name", async () => {
    await openPostScreen(new FakeEventRepository());
    expect(screen.getByRole("button", { name: /post event/i })).toBeDisabled();
  });

  it("sends the trimmed form through the repository", async () => {
    const repository = new FakeEventRepository();
    const user = await openPostScreen(repository);

    await user.type(screen.getByLabelText("Event name"), "  Pizza in 401  ");
    await user.type(screen.getByLabelText("Location"), "Engineering 401");
    await user.click(screen.getByRole("button", { name: /post event/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/pizza in 401/i);
    expect(repository.postedEvents).toHaveLength(1);
    expect(repository.postedEvents[0].name).toBe("Pizza in 401");
  });

  it("clears the form after a successful post", async () => {
    const user = await openPostScreen(new FakeEventRepository());
    await user.type(screen.getByLabelText("Event name"), "Pizza in 401");
    await user.click(screen.getByRole("button", { name: /post event/i }));
    await screen.findByRole("status");
    expect(screen.getByLabelText("Event name")).toHaveValue("");
  });

  it("reports a failed write in plain language and keeps the form", async () => {
    const repository = new FakeEventRepository();
    repository.shouldThrow = true;
    const user = await openPostScreen(repository);

    await user.type(screen.getByLabelText("Event name"), "Pizza in 401");
    await user.click(screen.getByRole("button", { name: /post event/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t post/i);
    // Losing what the organiser typed because the network failed would be its
    // own usability bug.
    expect(screen.getByLabelText("Event name")).toHaveValue("Pizza in 401");
  });

  it("marks an invalid portion count for assistive technology", async () => {
    const user = await openPostScreen(new FakeEventRepository());
    const portions = screen.getByLabelText("Portions");
    await user.clear(portions);
    await user.type(portions, "0");
    expect(portions).toHaveAttribute("aria-invalid", "true");
  });
});

describe("who posted it", () => {
  it("does not tell the server who posted it: the token does that", async () => {
    const repository = new FakeEventRepository();
    const user = await openPostScreen(repository, { uid: "u3", name: "Mei", email: null });

    await user.type(screen.getByLabelText("Event name"), "Business mixer leftovers");
    await user.click(screen.getByRole("button", { name: /post event/i }));

    await screen.findByRole("status");
    expect(repository.postedEvents[0]).not.toHaveProperty("postedById");
  });

  it("says out loud who it is about to post as", async () => {
    const organiser = ORGANISERS[3];
    const repository = new FakeEventRepository();
    // The name on screen is the server's answer to "me", not the Google name.
    repository.me = organiser;
    await openPostScreen(repository, {
      uid: organiser.id,
      name: organiser.name,
      email: null,
    });
    expect(screen.getByText(/posting as/i)).toHaveTextContent(organiser.name);
  });
});
