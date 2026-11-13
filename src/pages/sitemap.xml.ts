import type { APIRoute } from "astro";
import { SITE } from "../site";

// Pages à indexer seulement. /carte (page du QR de la carte de visite) et la 404 en sont exclues : elles portent noindex.
// Adresses avec la barre finale : Astro les publie en dossiers (mentions-legales/index.html), servis sous cette forme
const pages = [
  "/",
  "/design-ux-ui/",
  "/sites-web/",
  "/applications-natives/",
  "/mentions-legales/",
  "/confidentialite/",
];

export const GET: APIRoute = () => {
  const urls = pages.map((p) => `  <url><loc>${SITE}${p}</loc></url>`).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
