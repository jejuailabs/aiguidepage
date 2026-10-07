import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "AI 전시관",
    short_name: "AI 전시관",
    description: "AI와 프롬프트, 간단한 도구를 한곳에서 만나는 전시관",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3f2ee",
    theme_color: "#f3f2ee",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
