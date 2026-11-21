/**
 * WarningsRecheck: what a warnings re-check agent returns for one story (tagging/WARNINGS.md).
 * pipeline/apply-warnings.ts merges it into the story's tag record: only the strict warnings,
 * their mentions and their evidence change.
 */
import { z } from 'zod';

export const WarningsRecheckSchema = z.object({
  story_id: z.string().min(1),
  /** Strict warnings the story spends real time on. */
  detailed: z.array(z.string()),
  /** Strict warnings mentioned without detail. Never repeats one in `detailed`. */
  mentions: z.array(z.string()),
  evidence: z
    .array(
      z.object({
        facet: z.enum(['content_warnings', 'content_mentions']),
        part: z.number().int().min(1),
        at: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'HH:MM:SS'),
        note: z.string().max(120),
      }),
    )
    .max(6),
  notes: z.string().max(400).optional(),
});

export type WarningsRecheck = z.infer<typeof WarningsRecheckSchema>;
