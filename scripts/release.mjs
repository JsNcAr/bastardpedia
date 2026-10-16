#!/usr/bin/env node
/**
 * Cut a release (adapted from ChronoTeach, without the Android publish step):
 *
 *   npm run release -- patch            # or minor, major, 1.2.0-rc.1
 *
 * prepare refuses unless you are on a clean, up-to-date main and the tag is
 * new. It runs the fast checks, sets the version in package.json, the
 * lockfile and the README, turns CHANGELOG.md's Unreleased into the release
 * (or writes it from the Conventional Commits since the last tag when
 * Unreleased is empty), commits `build(repo): release vX.Y.Z`, tags it with
 * the notes, and asks before pushing main and the tag in one atomic push.
 * That push starts the tag pipeline: release (checks, catalog, build, e2e),
 * then deploy_web. Until then nothing has left this machine; undo with
 * `git tag -d vX.Y.Z && git reset --hard HEAD~1`.
 *
 * Also: `check-version <tag>` (CI: the tag matches every version field),
 * `notes <version>`, `version`. Hosts and paths come from project.config.json.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import {
  PROJECT_URL,
  ReleaseError,
  addRelease,
  bump,
  parseVersion,
  releaseNotes,
  renderSection,
  writeReadmeStatus,
} from './lib/release-core.mjs';

const ROOT = resolve(import.meta.dirname, '..');
process.chdir(ROOT);

const BRANCH = 'main';
const REMOTE = 'origin';
const FILES = {
  pkg: 'package.json',
  lock: 'package-lock.json',
  changelog: 'CHANGELOG.md',
  readme: 'README.md',
};

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const positional = args.filter((a) => !a.startsWith('--'));

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const gitOk = (...a) => spawnSync('git', a, { encoding: 'utf8' });
const run = (cmd, a) => {
  const r = spawnSync(cmd, a, { stdio: 'inherit' });
  if (r.status !== 0) throw new ReleaseError(`${[cmd, ...a].join(' ')} failed`);
};
const projectVersion = () => JSON.parse(readFileSync(FILES.pkg, 'utf8')).version;

async function confirm(question) {
  if (flag('yes')) return true;
  if (!process.stdin.isTTY)
    throw new ReleaseError(`${question} needs an answer; rerun with --yes to proceed`);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${question} [y/N] `);
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

function lastTag() {
  const r = gitOk('describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*');
  return r.status === 0 ? r.stdout.trim() : null;
}

function commitsSince(tag) {
  const raw = git(
    'log',
    tag ? `${tag}..HEAD` : 'HEAD',
    '--no-merges',
    '--reverse',
    '--format=%H%x1f%s%x1f%b%x1e',
  );
  return raw
    .split('\x1e')
    .filter((r) => r.trim())
    .map((r) => {
      const [sha, subject, body = ''] = r.replace(/^\n/, '').split('\x1f');
      return { sha, subject, body };
    });
}

function preflight(tag) {
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  if (branch !== BRANCH && !flag('allow-branch'))
    throw new ReleaseError(`releases are cut from ${BRANCH}; you are on ${branch}`);
  if (git('status', '--porcelain'))
    throw new ReleaseError('the working tree has uncommitted changes; commit or stash them first');
  git('fetch', '--tags', REMOTE);
  const behind = gitOk('rev-list', '--count', `HEAD..${REMOTE}/${branch}`).stdout.trim();
  if (behind && behind !== '0')
    throw new ReleaseError(
      `${branch} is ${behind} commit(s) behind ${REMOTE}/${branch}; pull first`,
    );
  if (git('tag', '--list', tag)) throw new ReleaseError(`tag ${tag} already exists`);
  if (git('ls-remote', '--tags', REMOTE, `refs/tags/${tag}`))
    throw new ReleaseError(`tag ${tag} already exists on ${REMOTE}`);
  return branch;
}

async function prepare() {
  const part = positional[1];
  if (!part)
    throw new ReleaseError(
      'say which release: patch, minor, major, or an explicit version (1.2.0-rc.1)',
    );
  const current = projectVersion();
  const version = bump(current, part);
  const tag = `v${version}`;
  const branch = preflight(tag);

  const previous = lastTag();
  const generated = renderSection(commitsSince(previous));
  const date = new Date().toISOString().slice(0, 10);
  const { changelog, notes } = addRelease(readFileSync(FILES.changelog, 'utf8'), {
    version,
    previous: previous?.replace(/^v/, '') ?? current,
    generated,
    date,
  });

  console.log(
    `\nRelease ${tag}  (from ${current}; changes since ${previous ?? 'the first commit'})\n`,
  );
  console.log(`${notes}\n`);
  if (flag('dry-run')) {
    console.log('Dry run: nothing written.');
    return;
  }

  if (!flag('skip-checks')) {
    console.log(
      '== Checks: type-check, lint, unit tests, tags, deploy config (build + e2e run on the tag in CI)',
    );
    run('npm', ['run', '--silent', 'typecheck']);
    run('npm', ['run', '--silent', 'lint']);
    run('npm', ['test', '--silent']);
    run('npm', ['run', '--silent', 'tags:validate']);
    run('node', ['scripts/deploy-config.mjs', '--check']);
  }

  const originals = Object.fromEntries(
    Object.values(FILES).map((f) => [f, readFileSync(f, 'utf8')]),
  );
  const restore = () => {
    for (const [f, text] of Object.entries(originals)) writeFileSync(f, text);
    gitOk('reset', '-q', '--', ...Object.values(FILES));
    console.log('The version files were restored; nothing was committed.');
  };
  try {
    run('npm', ['version', version, '--no-git-tag-version', '--ignore-scripts', '--silent']);
    writeFileSync(FILES.changelog, changelog);
    writeFileSync(FILES.readme, writeReadmeStatus(readFileSync(FILES.readme, 'utf8'), version));
    run('npx', ['prettier', '--log-level', 'warn', '--write', FILES.readme]);
    if (!(await confirm(`Commit and tag ${tag}?`)))
      throw new ReleaseError('stopped before committing');
    git('add', ...Object.values(FILES));
    run('git', ['commit', '-q', '-m', `build(repo): release ${tag}`]);
  } catch (e) {
    restore();
    throw e;
  }
  // verbatim: notes use ### headings, which git would strip as comments.
  git('tag', '-a', tag, '--cleanup=verbatim', '-m', `${tag}\n\n${notes}`);
  console.log(`Committed and tagged ${tag} locally.`);

  const push = ['push', '--atomic', REMOTE, branch, tag];
  if (
    flag('no-push') ||
    !(await confirm(`Push ${branch} and ${tag} to ${REMOTE}? (starts release, then deploy_web)`))
  ) {
    console.log(`Not pushed. When ready:  git ${push.join(' ')}`);
    console.log(`To undo instead:         git tag -d ${tag} && git reset --hard HEAD~1`);
    return;
  }
  run('git', push);
  console.log(`\nPushed. The tag pipeline is running: ${PROJECT_URL}/-/pipelines?ref=${tag}`);
}

function checkVersion() {
  const tag = positional[1] ?? '';
  const want = tag.replace(/^refs\/tags\//, '').replace(/^v/, '');
  parseVersion(want);
  const problems = [];
  const pkg = projectVersion();
  const lock = JSON.parse(readFileSync(FILES.lock, 'utf8')).version;
  if (pkg !== want) problems.push(`package.json is ${pkg}`);
  if (lock !== want) problems.push(`package-lock.json is ${String(lock)}`);
  try {
    releaseNotes(readFileSync(FILES.changelog, 'utf8'), want);
  } catch {
    problems.push(`CHANGELOG.md has no [${want}] section`);
  }
  if (problems.length) throw new ReleaseError(`tag ${tag} does not match: ${problems.join('; ')}`);
  console.log(`ok: ${tag} matches package.json, the lockfile and CHANGELOG.md`);
}

const commands = {
  prepare,
  'check-version': checkVersion,
  notes: () =>
    console.log(
      releaseNotes(
        readFileSync(FILES.changelog, 'utf8'),
        (positional[1] ?? projectVersion()).replace(/^v/, ''),
      ),
    ),
  version: () => console.log(projectVersion()),
};

const command = commands[positional[0]];
if (!command) {
  console.error(
    'usage: release.mjs prepare <patch|minor|major|X.Y.Z> [--dry-run] [--skip-checks] [--no-push] [--yes]',
  );
  console.error('       release.mjs check-version <tag> | notes [version] | version');
  process.exit(2);
}
try {
  await command();
} catch (e) {
  if (e instanceof ReleaseError) {
    console.error(`release: ${e.message}`);
    process.exit(1);
  }
  throw e;
}
