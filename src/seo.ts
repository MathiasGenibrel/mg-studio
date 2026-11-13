/* Données structurées (JSON-LD, schema.org). Une seule entité MG Studio, référencée par @id depuis chaque page */
import type { Service } from "./data/services";
import { services } from "./data/services";
import { EMAIL, PERSON, PHONE, SITE } from "./site";

type Node = Record<string, unknown>;

export const ORG_ID = `${SITE}/#studio`;
const PERSON_ID = `${SITE}/#mathias`;
const WEBSITE_ID = `${SITE}/#site`;

/** Le studio, son fondateur et le site : présents sur chaque page indexable */
export function siteGraph(): Node[] {
  return [
    {
      "@type": "ProfessionalService",
      "@id": ORG_ID,
      name: "MG Studio",
      url: `${SITE}/`,
      logo: `${SITE}/logo-mg-studio.svg`,
      slogan: "Pour l’humain.",
      description:
        "Design UX/UI, sites web sur mesure et applications natives (macOS, iOS, Android), faits avec l’IA, pour l’humain.",
      email: EMAIL,
      telephone: PHONE.e164,
      // Adresse réduite à la ville : l’adresse complète figure dans les mentions légales
      address: {
        "@type": "PostalAddress",
        addressLocality: PERSON.city,
        postalCode: PERSON.postcode,
        addressRegion: "Occitanie",
        addressCountry: "FR",
      },
      areaServed: [
        { "@type": "City", name: "Perpignan" },
        { "@type": "AdministrativeArea", name: "Pyrénées-Orientales" },
        { "@type": "Country", name: "France" },
      ],
      identifier: { "@type": "PropertyValue", propertyID: "SIRET", value: "93500106500017" },
      founder: { "@id": PERSON_ID },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Atelier",
        itemListElement: services.map((s) => ({
          "@type": "Offer",
          itemOffered: { "@id": `${SITE}/${s.slug}/#service` },
        })),
      },
    },
    {
      "@type": "Person",
      "@id": PERSON_ID,
      name: `${PERSON.given} ${PERSON.family}`,
      givenName: PERSON.given,
      familyName: PERSON.family,
      jobTitle: PERSON.craft,
      worksFor: { "@id": ORG_ID },
      url: `${SITE}/`,
      sameAs: ["https://github.com/MathiasGenibrel"],
    },
    {
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      url: `${SITE}/`,
      name: "MG Studio",
      inLanguage: "fr-FR",
      publisher: { "@id": ORG_ID },
    },
  ];
}

/** Fil d’Ariane : Accueil › … › page */
export function breadcrumb(items: [string, string][]): Node {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [["Accueil", "/"] as [string, string], ...items].map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: `${SITE}${path}`,
    })),
  };
}

/** Page de service : le service, ses questions fréquentes et le fil d’Ariane */
export function serviceGraph(s: Service): Node[] {
  const url = `${SITE}/${s.slug}/`;
  return [
    {
      "@type": "Service",
      "@id": `${url}#service`,
      name: s.name,
      serviceType: s.name,
      description: s.description,
      url,
      provider: { "@id": ORG_ID },
      areaServed: { "@type": "Country", name: "France" },
    },
    {
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: s.faq.map(([q, a]) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
    breadcrumb([[s.name, `/${s.slug}/`]]),
  ];
}

/** Accueil : les apps éditées par le studio */
export function productsGraph(): Node[] {
  const repo = "https://github.com/MathiasGenibrel/toolings/tree/main/packages";
  const app = (name: string, description: string, path: string): Node => ({
    "@type": "SoftwareApplication",
    name,
    description,
    operatingSystem: "macOS",
    applicationCategory: "UtilitiesApplication",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    url: `${repo}/${path}`,
    author: { "@id": ORG_ID },
  });
  return [
    app(
      "Pulse",
      "CPU, mémoire et disque, d’un coup d’œil dans la barre des menus. Le coupable, groupé par app.",
      "pulse",
    ),
    app(
      "Limitless",
      "Ce qu’il reste de vos forfaits Claude, Codex et Gemini, avant de toucher le mur.",
      "limitless",
    ),
  ];
}
