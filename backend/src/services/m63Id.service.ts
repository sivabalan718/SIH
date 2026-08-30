const M63_ID_PREFIX = 'M63-';
const M63_CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 6;

export function generateCandidateM63Id(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * M63_CHARSET.length);
    code += M63_CHARSET[randomIndex];
  }
  return `${M63_ID_PREFIX}${code}`;
}

export function isValidM63IdFormat(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  const regex = /^M63-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/i;
  return regex.test(id.trim());
}
