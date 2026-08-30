import { generateCandidateM63Id, isValidM63IdFormat } from '../src/services/m63Id.service.js';

describe('M63 ID Generator & Validator', () => {
  test('should generate candidate ID in format M63-XXXXXX', () => {
    const candidate = generateCandidateM63Id();
    expect(candidate).toMatch(/^M63-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
  });

  test('should correctly validate valid M63 IDs', () => {
    expect(isValidM63IdFormat('M63-M9MA2V')).toBe(true);
    expect(isValidM63IdFormat('M63-K9P4WX')).toBe(true);
  });

  test('should reject invalid M63 ID formats', () => {
    expect(isValidM63IdFormat('M63-123')).toBe(false);
    expect(isValidM63IdFormat('M63-INVALIDCHAR!')).toBe(false);
    expect(isValidM63IdFormat('USER-847291')).toBe(false);
    expect(isValidM63IdFormat('')).toBe(false);
  });
});
