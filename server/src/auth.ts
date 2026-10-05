// COMPSCI 734 - who is calling.
//
// The client sends a Firebase ID token: a JWT signed by Google. We check it
// against Google's public keys, and only then treat the caller as known.
//
// Three outcomes for every request:
//   no Authorization header   -> caller is null. Reads still work; the feed is public.
//   a token that verifies     -> caller is that user.
//   a token that does not     -> 401, straight away. A bad credential is not
//                                the same thing as no credential.

import { GraphQLError } from 'graphql';

import type { User } from './data';
import { auth } from './firebase';
import { store } from './store';

export type Caller = {
  uid: string;
  email: string | null;
  name: string | null;
};

/** What every resolver receives as its third argument. */
export type Context = {
  caller: Caller | null;
};

export function unauthenticated(message: string): GraphQLError {
  // extensions.http.status makes Apollo answer with a real 401 rather than
  // GraphQL's usual "200, with an errors array".
  return new GraphQLError(message, {
    extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } },
  });
}

export function forbidden(message: string): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: 'FORBIDDEN', http: { status: 403 } },
  });
}

/**
 * Reads "Authorization: Bearer <token>" and verifies the token.
 *
 * verifyIdToken checks, in order: the signature (made by Google's private key?),
 * the audience (issued for OUR Firebase project?), the issuer, and the expiry.
 * Any failure throws, and none of it involves a password or a database.
 */
export async function callerFrom(header: string | undefined): Promise<Caller | null> {
  if (!header) return null;
  const match = header.match(/^Bearer (.+)$/);
  if (!match) throw unauthenticated('Authorization header must be "Bearer <token>".');

  try {
    const decoded = await auth.verifyIdToken(match[1]);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: (decoded.name as string | undefined) ?? null,
    };
  } catch {
    // Deliberately vague to the client, specific in the log.
    console.log('auth: rejected a token that did not verify');
    throw unauthenticated('That token is not valid. Sign in again.');
  }
}

/** For resolvers that change something: no caller, no entry. */
export function requireSignedIn(context: Context): Caller {
  if (!context.caller) throw unauthenticated('Sign in first.');
  return context.caller;
}

/**
 * Signed in is not the same as allowed. Any Google account can get a valid
 * token; whether it belongs to an organiser is our data, not Google's.
 */
export async function requireOrganiser(
  context: Context,
): Promise<{ caller: Caller; organiser: User }> {
  const caller = requireSignedIn(context);
  const organiser = await store.organiser(caller.uid);
  if (!organiser) {
    console.log(`auth: ${caller.email ?? caller.uid} is signed in but not an organiser`);
    throw forbidden(`You are signed in as ${caller.email ?? caller.uid}, but you are not an organiser.`);
  }
  return { caller, organiser };
}
