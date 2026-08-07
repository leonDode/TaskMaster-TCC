import { describe, expect, it } from 'vitest';
import { translate } from './translate';
import type { NamespaceDictionary } from './types';

const dictionary: NamespaceDictionary = {
  settings: {
    title: 'Settings',
    resetSuccessMessage: {
      one: '{count} task deleted.',
      other: '{count} tasks deleted.',
    },
  },
};

describe('translate', () => {
  it('resolves a plain string by dot-path key', () => {
    expect(translate(dictionary, 'settings.title')).toBe('Settings');
  });

  it('interpolates {name} placeholders from params', () => {
    const dict: NamespaceDictionary = { greeting: 'Hello, {name}!' };
    expect(translate(dict, 'greeting', { name: 'Ana' })).toBe('Hello, Ana!');
  });

  it('picks the singular plural form when count is 1', () => {
    expect(
      translate(dictionary, 'settings.resetSuccessMessage', { count: 1 }),
    ).toBe('1 task deleted.');
  });

  it('picks the plural form when count is not 1', () => {
    expect(
      translate(dictionary, 'settings.resetSuccessMessage', { count: 0 }),
    ).toBe('0 tasks deleted.');
    expect(
      translate(dictionary, 'settings.resetSuccessMessage', { count: 3 }),
    ).toBe('3 tasks deleted.');
  });

  it('falls back to the key itself when it is missing', () => {
    expect(translate(dictionary, 'settings.missingKey')).toBe(
      'settings.missingKey',
    );
  });
});
