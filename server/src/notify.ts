// COMPSCI 734 - telling phones that are not looking.
//
// Firestore reaches every phone with the app OPEN. That is most of the value
// and none of the point of a food app: the person who needs to know about free
// samosas is the one in a lecture with their phone in their pocket.
//
// FCM is the only door to that phone. Not a library choice, a platform fact:
// on Android every app's push arrives over one connection that the OS holds
// open, and on iOS the equivalent is APNs. An app cannot keep its own socket
// alive in the background, and every push vendor you have heard of delivers
// through these two rails.

import { messaging } from './firebase';

// One topic, and everybody is on it. A topic is a name a client subscribes to;
// nobody registers it and nobody manages a subscriber list. This is the
// bluntest possible broadcast, and per-person targeting is a lab exercise.
const TOPIC = 'kai-events';

// A NOTIFICATION message rather than a data message. The difference matters:
// with a notification block the operating system draws the banner itself when
// the app is backgrounded, and our code never runs. A data-only message hands
// the payload to the app instead, which is more flexible and, on a phone that
// is not running, arrives nowhere anyone can see.
export async function announce(name: string, location: string, portions: number): Promise<void> {
  try {
    await messaging.send({
      topic: TOPIC,
      notification: {
        title: `Free kai: ${name}`,
        body: `${location} - ${portions} portions`,
      },
    });
    console.log(`notified topic ${TOPIC}: ${name}`);
  } catch (error) {
    // Deliberately swallowed. The event IS posted; the write already
    // succeeded. Failing the whole mutation because Google was briefly
    // unreachable would throw away real data to report a missed banner, and
    // FCM is best-effort delivery anyway. Notifications are an invitation to
    // come and look, never the truth itself.
    console.error('notification failed, event still posted:', error);
  }
}
