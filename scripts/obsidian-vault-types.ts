export type VideoRow = {
  title: string;
  url: string;
  category: string;
  isLearned: boolean;
};

export type GeneratedNote = {
  url: string;
  summary: string;
  remember: string[];
  discussionQuestions: string[];
  concepts: string[];
  takeaways: string[];
};
