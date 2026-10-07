import { lazy } from "react";
export const toolRegistry = {
  "prompt-builder": lazy(() => import("./prompt-builder")),
  "char-count": lazy(() => import("./char-count")),
  "qr-maker": lazy(() => import("./qr-maker")),
  "template-fill": lazy(() => import("./template-fill")),
};
