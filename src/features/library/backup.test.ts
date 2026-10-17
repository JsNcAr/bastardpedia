import { emptyEntry } from '@/data';
import { BackupError, backupFileName, parseBackup, toBackup } from './backup';

describe('library backup', () => {
  const now = new Date('2026-10-16T12:00:00.000Z');

  it('round-trips through JSON', () => {
    const backup = toBackup([{ ...emptyEntry('a', now.toISOString()), favourite: true }], now);
    expect(parseBackup(JSON.stringify(backup))).toEqual(backup);
  });

  it('names the file after the project and the date', () => {
    expect(backupFileName(now)).toMatch(/-library-2026-10-16\.json$/);
  });

  it('rejects text that is not JSON or not a backup', () => {
    expect(() => parseBackup('not json')).toThrow(BackupError);
    expect(() => parseBackup('{"schema":"catalog/1"}')).toThrow(BackupError);
    expect(() =>
      parseBackup(JSON.stringify({ ...toBackup([], now), entries: [{ id: 'a' }] })),
    ).toThrow(BackupError);
  });
});
