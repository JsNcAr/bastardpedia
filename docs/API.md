# API contract (future)

There is no backend. This file is the contract a backend would implement, so the
app's data layer can switch from the static file to HTTP with one change in
`src/data/index.ts` (ADR 0001). `src/data/http.adapter.ts` implements the client
side and typechecks against these shapes, but nothing uses it yet.

## Why a backend might exist

- Syncing a person's library across devices.
- Serving the catalog in pages if it ever outgrows a single file (unlikely, see
  ADR 0001).
- Accepting community corrections to tags after the public launch.

## Cross-cutting rules

- Base path `/api/v1`. JSON only. UTF-8.
- Every read response validates against the same Zod schemas the app uses
  (`shared/schemas/`).
- Errors: `{ "error": { "code": string, "message": string, "field"?: string } }`
  with a matching HTTP status.
- Authentication (library endpoints only): `Authorization: Bearer <token>`.
  The catalog is public.
- Timestamps are ISO 8601 UTC.

## Catalog

| Method | Path                  | Response                | Notes                                                                    |
| ------ | --------------------- | ----------------------- | ------------------------------------------------------------------------ |
| GET    | `/api/v1/catalog`     | `Catalog` (`catalog/1`) | Same document as `/data/catalog.json`. Supports `ETag` / `If-None-Match` |
| GET    | `/api/v1/stories/:id` | `CatalogStory`          | 404 if unknown                                                           |

## Library (per user)

Mirrors `LibraryRepository` (`Crud<LibraryEntry>` from ChronoTeach): client ids,
soft deletes, and `changedSince` for sync.

| Method | Path                       | Body / query   | Response                                     |
| ------ | -------------------------- | -------------- | -------------------------------------------- |
| GET    | `/api/v1/library`          | —              | `LibraryEntry[]` (live entries)              |
| GET    | `/api/v1/library/:storyId` | —              | `LibraryEntry` or 404                        |
| PUT    | `/api/v1/library/:storyId` | `LibraryEntry` | `LibraryEntry` with the server's `updatedAt` |
| DELETE | `/api/v1/library/:storyId` | —              | 204. Sets `deletedAt`                        |
| GET    | `/api/v1/library/changes`  | `?since=<iso>` | `LibraryEntry[]`, tombstones included        |

`LibraryEntry`:
`{ id, status: 'want' | 'listened' | null, favourite: boolean, note: string, createdAt, updatedAt, deletedAt: string | null }`.

Conflict policy: last write wins on `updatedAt`. Revisit if notes ever get
edited on two devices often.

## What the backend must not do

- Serve transcript text (ADR 0007).
- Accept tag changes without review. Corrections would land as pending
  overrides, never directly in the catalog.
