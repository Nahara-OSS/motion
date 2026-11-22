# Nahara's Motion editing library

This library is intended to be used as supporting library for building editors for Nahara's Motion. For user-facing
editor app, see `app/editor`.

## Separation

It is recommended to separate the editor into independent threads: a thread for user interface, and another thread (or a
group of threads) for editor. Most of the code in this editing library should be living inside editor thread, and it is
up to editing app to establish the communication between UI and editor threads.

## About state updating

Throughout the editing library, the states have the `<T>(state: T, ...params: any[]) => T` functions which can be used
to update the state.

- If that function return the value whose identity is the same as `state` (or in other words, `state === next`), assume
  no edit was made (this should be handled by `HistoryState`, unless `force` is `true`).

- If that function throws an error, no edit should be made and report that error to user.

- Otherwise consume the next state.
