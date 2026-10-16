// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  PROJECT_URL,
  ReleaseError,
  addRelease,
  bump,
  compareVersions,
  releaseNotes,
  renderSection,
  splitUnreleased,
  writeReadmeStatus,
} from './release-core.mjs';

describe('bump', () => {
  it('bumps each part', () => {
    expect(bump('1.0.1', 'patch')).toBe('1.0.2');
    expect(bump('1.0.1', 'minor')).toBe('1.1.0');
    expect(bump('1.0.1', 'major')).toBe('2.0.0');
  });
  it('finishes a pre-release whatever the part', () => {
    expect(bump('1.1.0-rc.2', 'patch')).toBe('1.1.0');
    expect(bump('1.1.0-rc.2', 'major')).toBe('1.1.0');
  });
  it('takes an explicit newer version, and refuses an older or equal one', () => {
    expect(bump('1.0.1', '1.1.0-rc.1')).toBe('1.1.0-rc.1');
    expect(() => bump('1.0.1', '1.0.1')).toThrow(ReleaseError);
    expect(() => bump('1.0.1', '1.0.0')).toThrow(ReleaseError);
    expect(() => bump('1.0.1', 'banana')).toThrow(ReleaseError);
  });
  it('sorts a pre-release before its release', () => {
    expect(compareVersions('1.1.0-rc.1', '1.1.0')).toBeLessThan(0);
    expect(compareVersions('1.1.0', '1.0.9')).toBeGreaterThan(0);
  });
});

const CHANGELOG = `# Changelog

Intro.

## [Unreleased]

### Fixed

- Something.

## [1.0.1] - 2026-10-02

The same app.

[Unreleased]: ${PROJECT_URL}/-/compare/v1.0.1...main
[1.0.1]: ${PROJECT_URL}/-/compare/v1.0.0...v1.0.1
`;

describe('changelog', () => {
  it('splits out the Unreleased body', () => {
    const [head, body, rest] = splitUnreleased(CHANGELOG);
    expect(head.endsWith('Intro.\n\n')).toBe(true);
    expect(body).toBe('### Fixed\n\n- Something.');
    expect(rest.startsWith('## [1.0.1]')).toBe(true);
  });

  it('turns Unreleased into the release and rewrites the compare links', () => {
    const { changelog, notes } = addRelease(CHANGELOG, {
      version: '1.0.2',
      previous: '1.0.1',
      generated: '',
      date: '2026-10-03',
    });
    expect(notes).toBe('### Fixed\n\n- Something.');
    expect(changelog).toContain(
      '## [Unreleased]\n\n## [1.0.2] - 2026-10-03\n\n### Fixed\n\n- Something.\n\n## [1.0.1]',
    );
    expect(changelog).toContain(
      `[Unreleased]: ${PROJECT_URL}/-/compare/v1.0.2...main\n[1.0.2]: ${PROJECT_URL}/-/compare/v1.0.1...v1.0.2\n[1.0.1]:`,
    );
    expect(releaseNotes(changelog, '1.0.2')).toBe(notes);
    expect(releaseNotes(changelog, '1.0.1')).toBe('The same app.');
  });

  it('uses generated notes when Unreleased is empty, and refuses when both are', () => {
    const empty = CHANGELOG.replace('### Fixed\n\n- Something.\n\n', '');
    const { notes } = addRelease(empty, {
      version: '1.0.2',
      previous: '1.0.1',
      generated: '### Added\n\n- x',
      date: 'd',
    });
    expect(notes).toBe('### Added\n\n- x');
    expect(() =>
      addRelease(empty, { version: '1.0.2', previous: '1.0.1', generated: '', date: 'd' }),
    ).toThrow(ReleaseError);
  });

  it('renders Conventional Commits by type and leaves housekeeping and releases out', () => {
    const notes = renderSection([
      { sha: 'aaaaaaaaaa', subject: 'feat(plan): edit block notes' },
      { sha: 'bbbbbbbbbb', subject: 'fix(live): readout moves' },
      { sha: 'cccccccccc', subject: 'chore(deps): bump vite' },
      { sha: 'dddddddddd', subject: 'build(repo): release 1.0.1' },
      { sha: 'eeeeeeeeee', subject: 'refactor(data)!: new schema' },
      { sha: 'ffffffffff', subject: 'Merge branch x into main' },
    ]);
    expect(notes).toBe(
      '### Breaking changes\n\n- **data:** new schema (eeeeeee)\n\n' +
        '### Added\n\n- **plan:** edit block notes (aaaaaaa)\n\n' +
        '### Fixed\n\n- **live:** readout moves (bbbbbbb)',
    );
  });
});

describe('readme status', () => {
  it('rewrites the README status line', () => {
    expect(writeReadmeStatus('> **Status: 1.0.1.** Use it', '1.1.0-rc.1')).toBe(
      '> **Status: 1.1.0-rc.1.** Use it',
    );
  });
});
