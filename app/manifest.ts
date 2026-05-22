import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lumi+",
    short_name: "Lumi+",
    description: "Монгол хадмалтай аниме, кино үзэх хөнгөн платформ.",
    start_url: "/",
    display: "standalone",
    background_color: "#050506",
    theme_color: "#050506",
    icons: [
      {
        src: "/images/lumi-icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/images/lumi-icon-512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
}
