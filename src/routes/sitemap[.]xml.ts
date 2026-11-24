import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { MODULES, SEQUENCE, getModule } from "@/lib/curriculum";

const BASE_URL = "https://llm.giribio.in";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries = [
          { path: "/", priority: "1.0" },
          ...SEQUENCE.map((id) => ({ path: getModule(id).to, priority: "0.8" })),
          ...MODULES.filter((m) => m.track === "labs").map((m) => ({ path: m.to, priority: "0.7" })),
          { path: "/path", priority: "0.6" },
          { path: "/glossary", priority: "0.6" },
          { path: "/about", priority: "0.5" },
        ];
        const urls = entries
          .map(
            (e) =>
              `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`
          )
          .join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});