import { describe, expect, it } from 'vitest';
import { PALETTE } from './palette';

describe('PALETTE', () => {
  it('exports gold and cyan theme anchors', () => {
    expect(PALETTE.GOLD).toBe(0xFFD700);
    expect(PALETTE.CYAN).toBe(0x00FFFF);
  });

  it('exports calm readable UI colors', () => {
    expect(PALETTE.VOID).toBe(0x0A0812);
    expect(PALETTE.SAND).toBe(0xC8A96E);
  });

  it('CSS tokens are hex strings', () => {
    Object.values(PALETTE.css).forEach((value) => expect(value).toMatch(/^#[0-9A-F]{6}$/));
  });
});