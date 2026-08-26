# Native SQLite Storage via node:sqlite

## Context
The application requires local, zero-cost, persistent storage for parsed rental listings, deduplication keys, scrape audit logs, and user pipeline state. Native C++ bindings such as `better-sqlite3` require node-gyp compilation that frequently breaks across modern Node versions (such as Node 25+ with V8 C++20 header constraints).

## Decision
We use Node.js's built-in `node:sqlite` (`DatabaseSync`) module directly. It requires zero external dependencies, compiles instantly with zero native toolchain dependencies, and provides fast synchronous prepared statements and indexed queries.
