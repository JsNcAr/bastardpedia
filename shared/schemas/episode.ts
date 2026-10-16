/** Episodes as parsed from the RSS feed (data/episodes.json) and stories as grouped from them (data/stories.json). */
import { z } from 'zod';

export const EpisodeSchema = z.object({
  guid: z.string(),
  title: z.string(),
  published: z.iso.datetime({ offset: true }),
  duration_s: z.number().int().nullable(),
  description: z.string(),
  link: z.string().nullable(),
  audio_url: z.string().nullable(),
  transcript_url: z.string().nullable(),
  transcript_srt_url: z.string().nullable(),
});
export type Episode = z.infer<typeof EpisodeSchema>;

export const STORY_KINDS = [
  'episode',
  'rerun',
  'ichh_weekly',
  'trailer',
  'fiction',
  'other_show',
] as const;

const PartRef = z.object({
  guid: z.string(),
  title: z.string(),
  part: z.number().int().min(1),
  published: z.iso.datetime({ offset: true }),
});

export const StorySchema = z.object({
  id: z.string(),
  /** Only kind === 'episode' stories are tagged and shipped. */
  kind: z.enum(STORY_KINDS),
  subject_title: z.string(),
  first_published: z.iso.datetime({ offset: true }),
  parts: z.array(PartRef).min(1),
  reruns: z.array(PartRef),
});
export type Story = z.infer<typeof StorySchema>;
