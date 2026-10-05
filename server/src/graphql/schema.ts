// COMPSCI 734 - the GraphQL schema, written in SDL.
// This is the contract. It says everything a client may ask for and the exact
// shape of what comes back, it is checked on every single request, and it is
// also the documentation, so the two can never drift apart.
//
// The ! suffix means non-null: a promise the server is making. [Event!]! reads
// from the inside out, a non-null list of non-null events, so the list may be
// empty but it is never null and never has a hole in it.
//
// postedBy is what makes this a graph rather than a list of records: an Event
// has a User hanging off it, and a client can walk from one to the other in a
// single request without the server offering a URL for that particular trip.

export const typeDefs = `#graphql
  type Event {
    id: ID!
    name: String!
    location: String!
    emoji: String!
    portionsLeft: Int!
    isActive: Boolean!
    lat: Float!
    lng: Float!
    # Nullable: a missing organiser profile should blank one field, not fail
    # the whole feed.
    postedBy: User
  }

  type User {
    id: ID!
    name: String!
    dept: String!
  }

  # Query is the front door: every query starts at one of these fields.
  # event(id) is deliberately nullable, because kai that does not exist is a
  # null rather than an error.
  type Query {
    events(activeOnly: Boolean = false): [Event!]!
    event(id: ID!): Event

    # The organiser profile of whoever is calling. Null when signed out, and
    # null when signed in but not an organiser.
    me: User
  }

  # Mutation is the other front door, for operations that change something.
  # The only real difference from a query is intent: a mutation returns the new
  # state, so a write and the read that confirms it are one round trip.
  #
  # postEvent returns Event! rather than Event: a post either happens or it
  # errors, so there is no such thing as a successful post with nothing to
  # show for it.
  #
  # There is no postedById argument: the server takes the poster from the
  # verified token.
  type Mutation {
    eatPortion(id: ID!): Event
    postEvent(
      name: String!
      location: String!
      emoji: String!
      portions: Int!
      lat: Float!
      lng: Float!
    ): Event!

    # Takes a listing down and returns the id that went. Nullable on purpose:
    # removing an event that has already gone is late, not wrong, so it is a
    # null rather than an error. (Added for the Lab 05 dashboard.)
    deleteEvent(id: ID!): ID
  }
`;
