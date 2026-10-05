import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../App";
import { FakeAuthService, PRIYA } from "../../auth/fake_auth_service";
import { FakeEventRepository } from "../../data/fake_event_repository";

describe("sign-in", () => {
  it("shows only the sign-in screen when nobody is signed in", async () => {
    render(<App repository={new FakeEventRepository()} auth={new FakeAuthService(null)} />);
    expect(screen.getByRole("button", { name: /sign in with google/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Post" })).not.toBeInTheDocument();
  });

  it("opens the dashboard once signed in, and says who you are", async () => {
    const user = userEvent.setup();
    render(
      <App repository={new FakeEventRepository()} auth={new FakeAuthService(null, PRIYA)} />,
    );
    await user.click(screen.getByRole("button", { name: /sign in with google/i }));

    expect(await screen.findByText("Free samosas")).toBeInTheDocument();
    expect(screen.getByText(/signed in as/i)).toHaveTextContent("Priya");
  });

  it("goes back to the sign-in screen on sign-out", async () => {
    const user = userEvent.setup();
    render(<App repository={new FakeEventRepository()} auth={new FakeAuthService()} />);
    await screen.findByText("Free samosas");

    await user.click(screen.getByRole("button", { name: /sign out/i }));
    expect(screen.getByRole("button", { name: /sign in with google/i })).toBeInTheDocument();
  });

  it("has no acting-as picker any more", async () => {
    render(<App repository={new FakeEventRepository()} auth={new FakeAuthService()} />);
    await screen.findByText("Free samosas");
    expect(screen.queryByLabelText(/acting as/i)).not.toBeInTheDocument();
  });
});
