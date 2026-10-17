/** Repository paths used by every pipeline step. */
import { join, resolve } from 'node:path';

export const ROOT = resolve(import.meta.dirname, '..', '..');
export const DATA_DIR = join(ROOT, 'data');
export const RAW_DIR = join(DATA_DIR, 'raw');
export const TRANSCRIPTS_DIR = join(DATA_DIR, 'transcripts');
export const PACKETS_DIR = join(DATA_DIR, 'packets');
export const TAGS_DIR = join(DATA_DIR, 'tags');
export const OVERRIDES_DIR = join(DATA_DIR, 'overrides');
export const REVIEW_STATUS_FILE = join(DATA_DIR, 'review-status.json');
export const EPISODES_FILE = join(DATA_DIR, 'episodes.json');
export const STORIES_FILE = join(DATA_DIR, 'stories.json');
export const CATALOG_FILE = join(ROOT, 'public', 'data', 'catalog.json');
export const TAXONOMY_DIR = join(ROOT, 'tagging', 'taxonomy');
