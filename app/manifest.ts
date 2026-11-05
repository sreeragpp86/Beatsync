import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BeatSync",
    short_name: "BeatSync",
    description: "Tactile neomorphic music streaming web player",
    start_url: "/",
    display: "standalone",
    background_color: "#E9ECEF",
    theme_color: "#E9ECEF",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
