import type { APIRoute } from "astro";
import { SITE } from "../site";

// /carte n’est volontairement pas en Disallow : un robot qui ne peut pas lire la page ne voit pas son noindex,
// et peut indexer l’adresse seule si un lien y mène. Sa non-indexation passe par la balise noindex et l’en-tête
// X-Robots-Tag (deploy/nginx/site.conf)
export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
