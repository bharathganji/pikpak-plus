import { MetadataRoute } from "next";

// Private family site: ask all crawlers to stay out
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
