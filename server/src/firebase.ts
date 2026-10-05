// COMPSCI 734 - the server's connection to Firebase.
//
// firebase-admin is the SDK for TRUSTED environments: a server, a cloud
// function, a build script. It authenticates with a service account rather
// than a user, and it bypasses security rules completely. It is root.
//
// That is exactly why it lives here and never on a phone. A phone holds a
// client SDK, which is subject to every rule you write. A server holds this.

import 'dotenv/config';

import { readFileSync } from 'node:fs';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// applicationDefault() reads the path in GOOGLE_APPLICATION_CREDENTIALS and
// loads the service account JSON from there. The key is a file on disk that
// git never sees, and the only thing in the repo is the variable's name.
// Hard-coding a key, or committing one, hands your project to whoever clones.
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!keyPath) {
  console.error('No GOOGLE_APPLICATION_CREDENTIALS set.');
  console.error('Copy server/.env.example to server/.env and point it at your');
  console.error('service account key. See the README for how to download one.');
  process.exit(1);
}

const app = initializeApp({ credential: applicationDefault() });

export const db = getFirestore(app);
export const messaging = getMessaging(app);

// Firebase Authentication, for verifyIdToken. It checks a token's signature
// against Google's public keys: this server can check tokens, not make them.
export const auth = getAuth(app);

// Which project are we actually pointed at? The key file says so, and asking
// it is the first thing to do when the data is not where you expected it.
export const projectId: string = JSON.parse(readFileSync(keyPath, 'utf8')).project_id;
