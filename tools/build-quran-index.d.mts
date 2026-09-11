import type { QuranIndex } from '../server/src/match.ts';

export declare function buildIndex(uthmani: Record<string, string>): QuranIndex;
export declare function writeIndex(dataDir?: string): {
  out: string;
  verses: number;
  words: number;
};
