/* Contenu des trois pages de services (maquettes Figma « Design UX/UI », « Sites web sur mesure », « Applications natives ») */

export type Fx = "draw" | "erase" | "give";
export type Tone = "night" | "blood" | "pulse" | "limitless" | "accord";

export interface Service {
  slug: string;
  name: string; // nom court (fil d’Ariane, liens, JSON-LD)
  title: [string, string]; // titre sur deux lignes
  rank: string;
  lead: string;
  description: string; // balise meta et JSON-LD
  verb: string;
  fx: Fx;
  phrase: string;
  brief: string;
  deliverables: [string, string][];
  steps: [string, string][];
  workTitle: string;
  work: { name: string; meta: string; text: string; tone: Tone }[];
  faq: [string, string][];
  teaser: string; // résumé dans les liens « autres services »
}

const pulse = {
  name: "Pulse",
  text: "Le moniteur système de la barre des menus : CPU, mémoire et disque, regroupés par app.",
  tone: "pulse",
} as const;
const limitless = {
  name: "Limitless",
  text: "Les limites d’usage de Claude, Codex et Gemini, toujours sous les yeux dans la barre des menus.",
  tone: "limitless",
} as const;

export const services: Service[] = [
  {
    slug: "design-ux-ui",
    name: "Design UX/UI",
    title: ["Design", "UX/UI."],
    rank: "1 sur 3",
    lead: "Des interfaces pensées pour l’usage et prêtes à être codées, dessinées par quelqu’un qui écrit aussi le code.",
    description:
      "Design UX/UI à Perpignan : parcours, maquettes Figma, prototypes et écrans annotés, prêts à être codés pour le web, iOS, macOS et Android.",
    verb: "Dessiner.",
    fx: "draw",
    phrase: "Chaque écran, chaque mouvement, au pixel près.",
    brief:
      "Mathias conçoit vos écrans web et mobiles dans Figma. Comme il développe lui-même en SwiftUI, en Kotlin et pour le web, chaque maquette intègre déjà les contraintes techniques, les états limites et l’accessibilité.",
    deliverables: [
      [
        "Un fichier Figma rangé",
        "Pages claires, composants à variantes, variables de couleur, d’espacement et de typographie.",
      ],
      [
        "Un prototype à tester",
        "Des parcours cliquables pour valider l’usage avant la première ligne de code.",
      ],
      [
        "Des écrans annotés",
        "Interactions, états, accessibilité et mouvements, écrits sur chaque écran.",
      ],
      [
        "Ou le code, directement",
        "Mathias peut aussi coder ce qu’il a dessiné, pour le web ou en natif.",
      ],
    ],
    steps: [
      ["Comprendre", "Qui utilise le produit, pour quoi faire, et ce qui gêne aujourd’hui."],
      ["Esquisser", "Les parcours et les écrans clés, deux pistes contrastées, une seule retenue."],
      ["Dessiner", "Tous les écrans, leurs états (chargement, vide, erreur) et le design system."],
      ["Transmettre", "Prototype, annotations, et un accompagnement au moment du code."],
    ],
    workTitle: "Déjà dessiné.",
    work: [
      { ...pulse, meta: "App macOS · interface et design system" },
      { ...limitless, meta: "App macOS · interface et design system" },
    ],
    faq: [
      [
        "Pouvez-vous faire seulement le design, si nous avons déjà des développeurs ?",
        "Oui : vous recevez un fichier structuré et annoté, et Mathias accompagne l’équipe au moment du passage au code.",
      ],
      [
        "Quelle différence avec une maquette graphique ?",
        "Une maquette montre un écran. Un travail UX/UI décide de ce que la personne doit faire, dans quel ordre, et de ce qui se passe quand ça ne marche pas.",
      ],
      [
        "Suivez-vous les règles d’Apple et de Google ?",
        "Oui : Liquid Glass sur Apple, Material 3 Expressive sur Android, et les règles d’accessibilité de chaque plateforme.",
      ],
    ],
    teaser: "Dessiner. Des interfaces pensées pour l’usage et prêtes à être codées.",
  },
  {
    slug: "sites-web",
    name: "Sites web sur mesure",
    title: ["Sites web", "sur mesure."],
    rank: "2 sur 3",
    lead: "Des sites sur mesure, rapides et légers, construits avec l’IA et livrés vite, pour les entreprises de Perpignan et d’ailleurs.",
    description:
      "Création de sites web sur mesure à Perpignan : rapides, légers, référencés pour Google et les assistants IA, avec un back-office à votre mesure.",
    verb: "Effacer.",
    fx: "erase",
    phrase: "On retire jusqu’à ce que le geste suffise.",
    brief:
      "Pas de constructeur générique ni d’extensions à surveiller : du HTML et du CSS propres, des pages légères, un référencement pensé pour Google comme pour les assistants IA. Et une mesure d’audience seulement si vous en voulez une.",
    deliverables: [
      ["Un site rapide, mobile d’abord", "Des pages légères, servies sans scripts superflus."],
      [
        "Un back-office à votre mesure",
        "Tarifs, formules ou horaires mis à jour par vous, sans interface générique.",
      ],
      [
        "Un référencement local et IA",
        "Données structurées, questions de vos clients, communes voisines.",
      ],
      [
        "Sécurisé, audience au choix",
        "Aucune extension tierce, un hébergement choisi avec vous. Une mesure d’audience si vous en voulez une : sans cookie de préférence, avec bandeau seulement si votre outil l’exige.",
      ],
    ],
    steps: [
      ["Cadrer", "Vos offres, vos clients, et ce que le site doit leur faire faire."],
      ["Dessiner", "Les pages clés en maquettes, sur mobile d’abord."],
      [
        "Coder",
        "Avec l’IA, puis relu et testé : rapide, accessible, en plusieurs langues si besoin.",
      ],
      ["Mettre en ligne", "Hébergement, nom de domaine et prise en main du back-office."],
    ],
    workTitle: "Déjà en ligne.",
    work: [
      {
        name: "Seb Auto Moto École",
        meta: "Site sur mesure · Pollestres et Villemolaque (66)",
        text: "Un site rapide, des tarifs clairs et un référencement local pour une auto-école et moto-école à deux agences.",
        tone: "night",
      },
      {
        name: "Action Motors School",
        meta: "Site de réservation · Provence Studios, Martigues",
        text: "Des stages de cascade moto : trois formules lisibles, la réservation et les bons cadeaux.",
        tone: "blood",
      },
    ],
    faq: [
      [
        "Pourrai-je modifier mes tarifs ou mes horaires moi-même ?",
        "Oui, grâce à un back-office construit pour vos besoins, sans la complexité d’une interface générique.",
      ],
      [
        "Aurai-je un bandeau de cookies ?",
        "Pas forcément : sans mesure d’audience, ou avec un outil qui ne dépose pas de cookie, il n’y a rien à accepter. Si vous choisissez un outil qui en dépose, le bandeau est installé proprement et vos visiteurs gardent le choix.",
      ],
      [
        "Vous déplacez-vous ?",
        "Oui, de Perpignan à Céret, pour le cadrage, les prises de vue et la prise en main du back-office. Au-delà, tout peut se faire en visioconférence sur Google Meet.",
      ],
    ],
    teaser: "Effacer. Des sites sur mesure, rapides et légers, livrés vite.",
  },
  {
    slug: "applications-natives",
    name: "Applications natives",
    title: ["Applications", "natives."],
    rank: "3 sur 3",
    lead: "Des apps macOS, iOS et Android écrites dans la langue de chaque plateforme, sûres dès la conception.",
    description:
      "Développement d’applications natives macOS, iOS (Swift, SwiftUI) et Android (Kotlin) à Perpignan, de la conception à la publication sur les stores.",
    verb: "Donner.",
    fx: "give",
    phrase: "Rien ne quitte votre appareil. Pas de pistage, pas de compte.",
    brief:
      "Swift 6 et SwiftUI pour Apple, Kotlin pour Android. Mathias édite ses propres utilitaires de barre des menus, Pulse et Limitless, et conçoit Accord, une messagerie chiffrée de bout en bout.",
    deliverables: [
      [
        "Une app par plateforme",
        "Les codes d’Apple et de Google respectés : Liquid Glass, Material 3 Expressive.",
      ],
      [
        "L’app et son serveur",
        "API, base de données et stockage dans un seul dépôt, si l’app en a besoin.",
      ],
      [
        "La sécurité dès le départ",
        "Chiffrement et minimum de données. Publicité ou mesure d’audience seulement si votre app en a besoin, toujours dans le respect du RGPD.",
      ],
      [
        "La mise en ligne",
        "Les versions de test, puis la publication sur l’App Store et Google Play.",
      ],
    ],
    steps: [
      ["Cadrer", "Ce que l’app doit faire, sur quels appareils, avec quelles données."],
      ["Dessiner", "Les écrans et les parcours, aux conventions de chaque plateforme."],
      ["Développer", "En Swift et en Kotlin, avec des versions de test régulières."],
      ["Publier", "La mise en ligne sur les stores, puis le suivi et les mises à jour."],
    ],
    workTitle: "Déjà construit.",
    work: [
      { ...pulse, meta: "App macOS · en production" },
      { ...limitless, meta: "App macOS · en production" },
      {
        name: "Accord",
        meta: "iOS et Android · en développement",
        text: "Une messagerie chiffrée de bout en bout, pour deux. Rien d’autre.",
        tone: "accord",
      },
    ],
    faq: [
      [
        "Quand préférer le natif au multiplateforme ?",
        "Pour les utilitaires de barre des menus, la cryptographie, le rendu Liquid Glass ou le blocage des captures d’écran. React Native reste pertinent pour des écrans métier partagés.",
      ],
      [
        "Développez-vous aussi le serveur ?",
        "Oui : Bun, Hono et PostgreSQL, avec un stockage compatible S3, dans le même dépôt que l’app.",
      ],
      [
        "Avez-vous travaillé sur des produits connectés ?",
        "Oui : l’app d’un boîtier connecté pour moto (GeoRide) et des logiciels pour photographes (CYME).",
      ],
    ],
    teaser: "Donner. Des apps macOS, iOS et Android, sûres dès la conception.",
  },
];

export const serviceBySlug = (slug: string): Service => {
  const s = services.find((x) => x.slug === slug);
  if (!s) throw new Error(`Service inconnu : ${slug}`);
  return s;
};
