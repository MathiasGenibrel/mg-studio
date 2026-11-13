import type { APIRoute } from "astro";
import { EMAIL, PERSON, PHONE, SITE } from "../site";

// Fiche contact de la page /carte (vCard 3.0, lue par iOS, Android, macOS et Outlook). Générée au build depuis src/site.ts
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/[,;]/g, (c) => `\\${c}`);

export const GET: APIRoute = () => {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${esc(PERSON.family)};${esc(PERSON.given)};;;`,
    `FN:${esc(`${PERSON.given} ${PERSON.family}`)}`,
    "ORG:MG Studio",
    `TITLE:${esc(PERSON.craft)}`,
    `TEL;TYPE=CELL:${PHONE.e164}`,
    `EMAIL;TYPE=INTERNET:${EMAIL}`,
    `URL:${SITE}`,
    `ADR;TYPE=WORK:;;;${esc(PERSON.city)};;${PERSON.postcode};France`,
    `NOTE:${esc(`${PERSON.status}. ${PERSON.offer}.`)}`,
    "END:VCARD",
  ];
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/vcard; charset=utf-8" },
  });
};
