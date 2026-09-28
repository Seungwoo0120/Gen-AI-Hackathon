import type { MetadataRoute } from "next";
import { en } from "@/lib/i18n/en";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: en.appName,
    short_name: en.appName,
    description: en.appDescription,
    start_url: "/chat",
    display: "standalone",
    background_color: "#f5f7f8",
    theme_color: "#075985",
    icons: [
      {
        src: "/icons/app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/app-icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
