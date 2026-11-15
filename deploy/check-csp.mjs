// Lancé après le build : chaque script en ligne exécuté par une page doit avoir son empreinte dans la
// Content-Security-Policy de deploy/nginx/site.conf, sinon le navigateur le bloquerait en production.
// Modifier le script en ligne de src/layouts/Base.astro impose donc de mettre à jour l'empreinte (donnée ici en cas d'échec).
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";

const conf = readFileSync(new URL("./nginx/site.conf", import.meta.url), "utf8");
const allowed = new Set((conf.match(/'sha256-[A-Za-z0-9+/=]+'/g) ?? []).map((h) => h.slice(1, -1)));
const dist = new URL("../dist/", import.meta.url);
const executable = new Set(["module", "text/javascript", "application/javascript"]);

const missing = new Map();
const used = new Set();
for (const file of readdirSync(dist, { recursive: true })) {
  if (!String(file).endsWith(".html")) continue;
  const html = readFileSync(new URL(String(file), dist), "utf8");
  for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\bsrc=/.test(attrs)) continue; // fichier du site : couvert par 'self'
    const type = attrs.match(/\btype="([^"]*)"/)?.[1];
    if (type && !executable.has(type)) continue; // données (JSON-LD) : jamais exécutées, hors CSP
    const hash = `sha256-${createHash("sha256").update(body).digest("base64")}`;
    used.add(hash);
    if (!allowed.has(hash)) missing.set(hash, [...(missing.get(hash) ?? []), String(file)]);
  }
}

for (const hash of allowed) {
  if (!used.has(hash))
    console.warn(`CSP : l'empreinte '${hash}' ne sert plus, à retirer de deploy/nginx/site.conf`);
}
if (missing.size) {
  for (const [hash, files] of missing) {
    console.error(
      `CSP : script en ligne non autorisé dans ${files.join(", ")}\n  ajouter '${hash}' à script-src dans deploy/nginx/site.conf`,
    );
  }
  process.exit(1);
}
console.log(`CSP : ${used.size} script(s) en ligne, tous autorisés`);
