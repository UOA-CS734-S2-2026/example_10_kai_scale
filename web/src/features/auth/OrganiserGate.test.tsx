import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../App";
import { FakeAuthService } from "../../auth/fake_auth_service";
import { FakeEventRepository } from "../../data/fake_event_repository";

const AROHA = { uid: "firebase-uid-aroha", name: "Aroha", email: "aroha@example.com" };

describe("signed in is not the same as allowed", () => {
  it("shows the not-an-organiser screen, with the uid an admin needs", async () => {
    const repository = new FakeEventRepository();
    repository.me = null;
    render(<App repository={repository} auth={new FakeAuthService(AROHA)} />);

    expect(await screen.findByText(/not an organiser yet/i)).toBeInTheDocument();
    expect(screen.getByTestId("uid")).toHaveTextContent(AROHA.uid);
    expect(screen.queryByRole("button", { name: "Post" })).not.toBeInTheDocument();
  });

  it("lets Aroha in once an admin has added her, with no reload", async () => {
    const user = userEvent.setup();
    const repository = new FakeEventRepository();
    repository.me = null;
    render(<App repository={repository} auth={new FakeAuthService(AROHA)} />);
    await screen.findByText(/not an organiser yet/i);

    // The admin adds her document in the Firebase console...
    repository.me = { id: AROHA.uid, name: "Aroha", dept: "Arts" };
    await user.click(screen.getByRole("button", { name: /check again/i }));

    expect(await screen.findByRole("button", { name: "Post" })).toBeInTheDocument();
  });

  it("says so when the server cannot be reached, rather than guessing", async () => {
    const repository = new FakeEventRepository();
    repository.meFails = true;
    render(<App repository={repository} auth={new FakeAuthService()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not reach/i);
  });
});
