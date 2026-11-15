import { describe, it, expect } from 'vitest';
import { CHAR_OPTS, CHAR_KEYS, CHAR_DEFAULT, CHAR_TABS, migrateChar, randomChar, sameChar, shapeKeys, validValue, isShapeKey } from '../src/characters/charSchema.js';
import { mulberry32 } from './helpers.js';

describe('character schema', () => {
  it('every option sits in a known tab and the defaults are valid options', () => {
    const tabs = new Set(CHAR_TABS.map(([t]) => t));
    for (const k of CHAR_KEYS){
      expect(tabs.has(CHAR_OPTS[k].tab), k).toBe(true);
      expect(validValue(k, CHAR_DEFAULT[k]), k).toBe(true);
      const ids = CHAR_OPTS[k].opts.map(([v]) => v);
      expect(new Set(ids).size, `${k} has duplicate ids`).toBe(ids.length);
    }
  });

  it('flags exactly the geometry-changing options as shape options', () => {
    expect(CHAR_KEYS.filter(isShapeKey).sort()).toEqual(['build', 'face', 'facial', 'gender', 'gloves', 'hairStyle', 'sleeves']);
  });
});

describe('migrateChar', () => {
  const v1 = { gender:'female', skin:'#7A4E33', hairStyle:'ponytail', hair:'#141414', facial:'none', helmet:'#F2F2EE', vest:'#F07A12' };

  it('keeps every field of a version 1 save and fills the new ones with defaults', () => {
    const c = migrateChar(v1);
    for (const k in v1) expect(c[k]).toBe(v1[k]);
    for (const k of ['build', 'face', 'eyes', 'shirt', 'sleeves', 'pants', 'gloves']) expect(c[k]).toBe(CHAR_DEFAULT[k]);
    expect(c.v).toBe(2);
  });

  it('replaces unknown values instead of discarding the save', () => {
    const c = migrateChar({ ...v1, helmet:'#123456', hairStyle:'mohawk', extra:1 });
    expect(c.helmet).toBe(CHAR_DEFAULT.helmet);
    expect(c.hairStyle).toBe(CHAR_DEFAULT.hairStyle);
    expect(c.skin).toBe(v1.skin);
    expect('extra' in c).toBe(false);
  });

  it('never gives a migrated woman a beard she did not choose', () => {
    expect(migrateChar({ gender:'female', facial:'wizard' }).facial).toBe('none');
  });

  it('rejects things that are not saves', () => {
    for (const bad of [null, undefined, 'x', 3, [], true]) expect(migrateChar(bad)).toBe(null);
  });

  it('is stable: migrating twice changes nothing', () => {
    const once = migrateChar(v1);
    expect(migrateChar(once)).toEqual(once);
  });
});

describe('randomChar', () => {
  it('only produces valid figures, and women get no facial hair', () => {
    const rand = mulberry32(7);
    for (let i = 0; i < 2000; i++){
      const c = randomChar(rand);
      for (const k of CHAR_KEYS) expect(validValue(k, c[k]), `${k}=${c[k]}`).toBe(true);
      if (c.gender === 'female') expect(c.facial).toBe('none');
    }
  });

  it('is deterministic for a seeded generator', () => {
    expect(randomChar(mulberry32(42))).toEqual(randomChar(mulberry32(42)));
  });
});

describe('shapeKeys and sameChar', () => {
  it('colour changes leave every shape key alone', () => {
    const a = { ...CHAR_DEFAULT }, b = { ...a, skin:'#55351F', hair:'#D8B56A', shirt:'#E9E9E4', pants:'#F07A12', eyes:'#4A78B0', vest:'#D93B2B', helmet:'#2A2D31' };
    expect(shapeKeys(b)).toEqual(shapeKeys(a));
    expect(sameChar(a, b)).toBe(false);
  });

  it('a hair style change touches only the hair part', () => {
    const a = { ...CHAR_DEFAULT }, b = { ...a, hairStyle:'afro' };
    const ka = shapeKeys(a), kb = shapeKeys(b);
    expect(Object.keys(ka).filter(p => ka[p] !== kb[p])).toEqual(['hair']);
  });
});
