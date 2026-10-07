"use client";
import { useEffect, useState } from "react";
import {
  defaultAiCategories,
  type AiCategory,
  type AiCategorySettings,
} from "./ai-categories";
export function useAiCategories(initial?: AiCategory[]) {
  const [categories, setCategories] = useState(initial || defaultAiCategories);
  useEffect(() => {
    if (initial) return;
    const controller = new AbortController();
    void fetch("/api/categories", { signal: controller.signal })
      .then(async (response) => {
        if (response.ok)
          setCategories(
            ((await response.json()) as AiCategorySettings).categories,
          );
      })
      .catch(() => {});
    return () => controller.abort();
  }, [initial]);
  return categories;
}
