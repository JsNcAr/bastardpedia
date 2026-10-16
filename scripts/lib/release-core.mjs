/**
 * The pure part of scripts/release.mjs: versions, the changelog, and the
 * README status line. No git, and no IO beyond reading project.config.json
 * once, so it is unit-tested directly (release-core.test.mjs).
 * Adapted from ChronoTeach without the Android version fields.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const project = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../../project.config.json'), 'utf8'),
);

export const PROJECT_URL = `${project.gitlab.url}/${project.gitlab.project}`;
export const UNRELEASED = '## [Unreleased]';

/** X.Y.Z with an optional pre-release suffix (1.1.0-rc.1). */
const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

export class ReleaseError extends Error {}

export function parseVersion(text) {
  const m = VERSION_RE.exec(String(text).trim());
  if (!m)
    throw new ReleaseError(`not a version: ${JSON.stringify(text)} (expected X.Y.Z or X.Y.Z-rc.N)`);
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]), pre: m[4] ?? null };
}

/** Negative, zero or positive, as a comparator. A pre-release sorts before its release. */
export function compareVersions(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  for (const k of ['major', 'minor', 'patch']) if (x[k] !== y[k]) return x[k] - y[k];
  if (x.pre === y.pre) return 0;
  if (x.pre === null) return 1;
  if (y.pre === null) return -1;
  return x.pre < y.pre ? -1 : 1;
}

/** `part` is patch, minor, major, or an explicit newer version. */
export function bump(current, part) {
  if (!['patch', 'minor', 'major'].includes(part)) {
    parseVersion(part);
    if (compareVersions(part, current) <= 0)
      throw new ReleaseError(`${part} is not newer than the current ${current}`);
    return part;
  }
  const { major, minor, patch, pre } = parseVersion(current);
  // 1.1.0-rc.2 -> 1.1.0 whatever the part: finishing a pre-release.
  if (pre) return `${String(major)}.${String(minor)}.${String(patch)}`;
  if (part === 'major') return `${String(major + 1)}.0.0`;
  if (part === 'minor') return `${String(major)}.${String(minor + 1)}.0`;
  return `${String(major)}.${String(minor)}.${String(patch + 1)}`;
}

// --- Changelog ----------------------------------------------------------------

/** Conventional Commit type -> heading, in display order. Others are housekeeping. */
const SECTIONS = {
  feat: 'Added',
  refactor: 'Changed',
  perf: 'Changed',
  fix: 'Fixed',
  docs: 'Documentation',
};
const COMMIT_RE = /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<bang>!)?: (?<desc>.+)$/;

/** Changelog entries from commits [{sha, subject, body}], grouped; '' if none qualify. */
export function renderSection(commits) {
  const groups = new Map();
  for (const { sha, subject, body = '' } of commits) {
    const m = COMMIT_RE.exec(subject);
    if (!m?.groups) continue;
    const { type, scope, bang, desc } = m.groups;
    if (/^release v?\d/.test(desc)) continue;
    const breaking = Boolean(bang) || body.includes('BREAKING CHANGE:');
    const heading = breaking ? 'Breaking changes' : SECTIONS[type];
    if (!heading) continue;
    if (!groups.has(heading)) groups.set(heading, []);
    groups.get(heading).push(`- ${scope ? `**${scope}:** ` : ''}${desc} (${sha.slice(0, 7)})`);
  }
  const order = ['Breaking changes', 'Added', 'Changed', 'Fixed', 'Documentation'];
  return order
    .filter((h) => groups.has(h))
    .map((h) => `### ${h}\n\n${groups.get(h).join('\n')}`)
    .join('\n\n');
}

/** [text before Unreleased, its body, text from the next heading or link block on]. */
export function splitUnreleased(changelog) {
  const start = changelog.indexOf(UNRELEASED);
  if (start < 0) throw new ReleaseError(`CHANGELOG.md has no "${UNRELEASED}" heading`);
  const bodyStart = start + UNRELEASED.length;
  const next = /^(## \[|\[Unreleased\]:)/m.exec(changelog.slice(bodyStart));
  const end = next ? bodyStart + next.index : changelog.length;
  return [changelog.slice(0, start), changelog.slice(bodyStart, end).trim(), changelog.slice(end)];
}

/**
 * Turn Unreleased into the version's section (or use `generated` when it is
 * empty), leave an empty Unreleased, and rewrite the compare links. Returns
 * { changelog, notes }.
 */
export function addRelease(changelog, { version, previous, generated, date }) {
  const [head, unreleased, rest] = splitUnreleased(changelog);
  const notes = unreleased || generated;
  if (!notes) {
    throw new ReleaseError(
      'nothing to release: Unreleased in CHANGELOG.md is empty and there are no feat/fix/perf/refactor/docs ' +
        'commits since the last tag. Write the notes under Unreleased.',
    );
  }
  let updated = `${head}${UNRELEASED}\n\n## [${version}] - ${date}\n\n${notes}\n\n${rest.trimStart()}`;
  const unreleasedLink = /^\[Unreleased\]: .*$/m;
  const links = `[Unreleased]: ${PROJECT_URL}/-/compare/v${version}...main\n[${version}]: ${PROJECT_URL}/-/compare/v${previous}...v${version}`;
  updated = unreleasedLink.test(updated)
    ? updated.replace(unreleasedLink, links)
    : `${updated.trimEnd()}\n\n${links}\n`;
  return { changelog: `${updated.trimEnd()}\n`, notes };
}

/** The body of `## [version]` in the changelog. */
export function releaseNotes(changelog, version) {
  const esc = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`^## \\[${esc}\\][^\\n]*\\n`, 'm').exec(changelog);
  if (!m) throw new ReleaseError(`CHANGELOG.md has no section for ${version}`);
  const after = changelog.slice(m.index + m[0].length);
  const next = /^(## \[|\[Unreleased\]:)/m.exec(after);
  return (next ? after.slice(0, next.index) : after).trim();
}

// --- Version fields -------------------------------------------------------------

/** The README's status line names the current release, if it has one. */
export function writeReadmeStatus(readme, version) {
  return readme.replace(/(\*\*Status: )\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\./, `$1${version}.`);
}
