import type { MetadataRoute } from "next";

/** Lets students and teachers install ClassProject as an app and receive device notifications. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ClassProject — Learning & Virtual Classroom",
    short_name: "ClassProject",
    description: "Classes, live lessons, assignments and grades for Ghanaian schools.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
