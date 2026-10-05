/** Shown instead of the app when web/.env.local is missing the Firebase config. */
export function FirebaseSetupNeeded() {
  return (
    <div className="app">
      <main className="app__main">
        <section className="sign-in">
          <h2>Firebase is not configured yet</h2>
          <p>
            Copy <code>web/.env.example</code> to <code>web/.env.local</code> and
            fill in your project&apos;s web app config, then restart{" "}
            <code>npm run dev</code>. The README walks through it.
          </p>
        </section>
      </main>
    </div>
  );
}
