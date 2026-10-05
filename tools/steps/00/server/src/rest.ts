// COMPSCI 734 - the REST half of the Kai Events server.
// Every route the Week 02 server had, answering exactly as it did, so the apps
// built in Week 02 and Week 03 run against this server unchanged.
//
// The routes ask the store seam rather than a data structure, so they do not
// care whether the data lives in memory or in Firestore.

import { Router } from 'express';

import { store } from './store';

// Artificial latency so loading spinners are actually visible in the client.
const EVENTS_LATENCY_MS = 300;

export const rest = Router();

rest.get('/health', (req, res) => {
  res.json({ ok: true });
});

rest.get('/events', (req, res) => {
  setTimeout(async () => {
    res.json(await store.events());
  }, EVENTS_LATENCY_MS);
});

rest.get('/events/:id', async (req, res) => {
  const event = await store.event(req.params.id);
  if (!event) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  res.json(event);
});

// The lecturer's controllable "someone just took one" moment:
// curl -X POST localhost:3734/events/free-samosas/eat
rest.post('/events/:id/eat', async (req, res) => {
  const event = await store.eatPortion(req.params.id);
  if (!event) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  res.json(event);
});

rest.post('/reset', async (req, res) => {
  res.json(await store.reset());
});

// People are resources too, and that one addition is what turns rendering a
// feed card into 1 + N requests.
rest.get('/users/:id', async (req, res) => {
  const user = await store.organiser(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  res.json(user);
});

// The bespoke aggregate endpoint: one screen's needs, baked into a URL. It
// works, and that is exactly the problem. Every other screen wants a different
// shape, so every other screen eventually gets a route of its own.
rest.get('/events-with-users', async (req, res) => {
  const events = await store.events();
  res.json(
    await Promise.all(
      events.map(async (event) => ({
        ...event,
        postedBy: await store.organiser(event.postedById),
      })),
    ),
  );
});
