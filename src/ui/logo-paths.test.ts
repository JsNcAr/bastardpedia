import master from '../../brand/masters/symbol.svg?raw';
import { LOGO_BOOK, LOGO_HALO, LOGO_TAIL } from './logo-paths';

const pathOf = (id: string) => new RegExp(`id="${id}"[^>]* d="([^"]+)"`).exec(master)?.[1];

describe('logo geometry', () => {
  it('matches the master symbol', () => {
    expect(LOGO_BOOK).toBe(pathOf('book'));
    expect(LOGO_HALO).toBe(pathOf('halo'));
    expect(LOGO_TAIL).toBe(pathOf('tail'));
  });
});
