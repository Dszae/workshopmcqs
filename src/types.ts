export interface Question {
  globalId: number;
  chapterTitle: string;
  questionText: string;
  options: string[];
  correctIdx: number;
  explanation: string;
  resourceLink: string | null;
}

export interface ChapterConfig {
  id: string;
  title: string;
  base: [string, string[], number, string, string][];
  targetCount: number;
}