export const logger = {
  info: (msg: string, ...args: any[]) => {
    console.log(`[INFO] [M63] ${msg}`, ...args);
  },
  warn: (msg: string, ...args: any[]) => {
    console.warn(`[WARN] [M63] ${msg}`, ...args);
  },
  error: (msg: string, ...args: any[]) => {
    console.error(`[ERROR] [M63] ${msg}`, ...args);
  },
};
