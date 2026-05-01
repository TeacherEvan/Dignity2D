import { describe, expect, it } from 'vitest';
import { buildUploadPolicy, normalizeRetention } from './processImage';

describe('processImage policy', () => {
  it('normalizes invalid retention to session', () => {
    expect(normalizeRetention('forever')).toBe('session');
  });

  it('builds session policy without public visibility', () => {
    const policy = buildUploadPolicy('session');
    expect(policy.public).toBe(false);
    expect(policy.stripMetadata).toBe(true);
    expect(policy.maxSide).toBe(1600);
  });
});