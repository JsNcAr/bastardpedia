/**
 * data/review-status.json: which stories a person has reviewed field by field.
 *
 * Kept apart from the tag records, which stay pure agent output (CLAUDE.md rule 3).
 * A story absent from this file is unreviewed: tagged by the agent, validated, and
 * shown in the app with an "unreviewed" marker (docs/TAGGING.md).
 */
import { z } from 'zod';

export const ReviewEntrySchema = z.object({
  status: z.literal('reviewed'),
  date: z.iso.date(),
});

export const ReviewStatusFileSchema = z.record(z.string(), ReviewEntrySchema);
export type ReviewStatusFile = z.infer<typeof ReviewStatusFileSchema>;
