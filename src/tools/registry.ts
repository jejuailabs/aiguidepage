import { lazy } from "react";
export const toolRegistry = {
  "prompt-builder": lazy(() => import("./prompt-builder")),
  "char-count": lazy(() => import("./char-count")),
  "qr-maker": lazy(() => import("./qr-maker")),
  "template-fill": lazy(() => import("./template-fill")),
  "maisa-business-plan": lazy(() => import("./maisa-tool")),
  "maisa-announcement": lazy(() => import("./maisa-tool")),
  "maisa-receipt": lazy(() => import("./maisa-tool")),
  "maisa-format": lazy(() => import("./maisa-tool")),
  "maisa-transcribe": lazy(() => import("./maisa-tool")),
  "maisa-narration": lazy(() => import("./maisa-tool")),
};
