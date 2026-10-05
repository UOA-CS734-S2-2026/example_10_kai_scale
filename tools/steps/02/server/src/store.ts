// COMPSCI 734 - which store the server actually uses.
//
// This file exists so that exactly one line has to change when the data moves
// out of the process and into a database. Everything else - both REST routes
// and every GraphQL resolver - imports from here and never learns the
// difference.
//
// Week 10 starts from the in-memory store on purpose: the events live in an
// array inside this process, the way they did in example_05. One process,
// one array, no problem. Watch what happens at step 2.

export { store, STORE_NAME } from './store-memory';
