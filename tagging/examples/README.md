# Gold records

Hand-checked reference records: each one was drafted from the story's full transcripts, then
reviewed field by field by a person on the review page (`tagging/review/`). They are the answer
key for scoring the tagger (docs/TAGGING.md) and fixtures for the validator.

| Folder                 | Status                                                               |
| ---------------------- | -------------------------------------------------------------------- |
| `*.json` (this folder) | Approved, every field marked OK. Taxonomy 0.3.0                      |
| `unreviewed/`          | Drafted with the same method but not yet reviewed. Scored separately |

Only records live here, never packets or transcripts (ADR 0007). Rebuild a packet with
`npm run tags:packet -- <story-id>`.
