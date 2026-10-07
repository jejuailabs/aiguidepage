import { lazy } from "react";
export const gameRegistry = {
  "memory-match": lazy(() => import("./memory-match")),
  "ai-quiz": lazy(() => import("./ai-quiz")),
};
