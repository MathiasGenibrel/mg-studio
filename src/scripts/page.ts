/* MG Studio · pages secondaires (mentions légales, vie privée, services, 404) : navigation, boutons, grands mots,
   sommaire, questions et soleil de la 404 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { clipDuring, magneticButtons, navAutoHide, wordFx } from "./common";
import { M } from "./motion";
import { blockReveals, lineReveals, pageIntro, seen } from "./reveal";

gsap.registerPlugin(ScrollTrigger, SplitText);

navAutoHide();

/* ---------- Services : questions ouvertes en desktop, repliées en mobile (on les ouvre au toucher) ---------- */
if (window.matchMedia("(max-width: 900px)").matches)
  document.querySelectorAll<HTMLDetailsElement>(".sv-qs details").forEach((d) => {
    d.open = false;
  });

/* Ouvrir ou fermer une question change la hauteur de la page : on recalcule les déclencheurs situés plus bas */
let refreshFrame = 0;
document.querySelectorAll<HTMLDetailsElement>(".sv-qs details").forEach((d) => {
  d.addEventListener("toggle", () => {
    cancelAnimationFrame(refreshFrame);
    refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
  });
});

/* ---------- Mentions légales et vie privée : le repère rouge suit la section lue ---------- */
const tocLinks = [...document.querySelectorAll<HTMLAnchorElement>(".lg-toc a")];
if (tocLinks.length) {
  const setActive = (id: string) => {
    tocLinks.forEach((a) => {
      const on = a.hash === `#${id}`;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "location");
      else a.removeAttribute("aria-current");
    });
  };
  // Bande d’observation au tiers haut de l’écran : la section qui la traverse est celle qu’on lit
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) setActive(e.target.id);
      });
    },
    { rootMargin: "-30% 0px -60% 0px" },
  );
  tocLinks.forEach((a) => {
    const el = document.getElementById(a.hash.slice(1));
    if (el) io.observe(el);
  });
}

/* ---------- Grands mots (services : Dessiner., Effacer., Donner. ; contact : Écrivez-moi.) ---------- */
void document.fonts.ready.then(() => {
  // Plus de 3 s : Base.astro a déjà retiré .js, l'en-tête est affiché au repos (pageIntro ne le rejoue pas)
  const late = !document.documentElement.classList.contains("js");
  const splits = new Map<Element, SplitText>();
  document.querySelectorAll("[data-split]").forEach((el) => {
    splits.set(
      el,
      SplitText.create(el, {
        type: "lines,chars",
        charsClass: "char",
        linesClass: "line",
        mask: "lines",
        aria: "auto",
      }),
    );
  });
  const chars = (el: Element): HTMLElement[] => (splits.get(el)?.chars ?? []) as HTMLElement[];

  const mm = gsap.matchMedia();
  mm.add(
    {
      full: "(prefers-reduced-motion: no-preference)",
      reduced: "(prefers-reduced-motion: reduce)",
      pointer: "(hover: hover) and (pointer: fine)",
    },
    (ctx) => {
      const { full = false, pointer = false } = ctx.conditions ?? {};
      pageIntro(!full, late);
      if (!full) {
        lineReveals(true);
        return blockReveals(true); // mouvement réduit : fondus seuls, les grands mots restent immobiles
      }
      /* Grands mots : les lettres montent à l'arrivée, comme « Écrivez-moi. » sur l'accueil (yPercent seul pour le
         verbe : ses effets pilotent --w, --fill, scale et x) */
      const rise = (
        h: HTMLElement | null,
        vars: gsap.TweenVars,
        trigger: Element | string,
        start: string,
      ): void => {
        if (!h || seen(h)) return;
        clipDuring(
          h,
          gsap.from(chars(h), {
            yPercent: 110,
            duration: M.expressive,
            ease: M.out,
            stagger: 0.03,
            ...vars,
            scrollTrigger: { trigger, start, once: true },
          }),
        );
      };
      const verb = document.querySelector<HTMLElement>("#sv-verb");
      rise(verb, {}, verb ?? "body", "top 90%"); // avant le jeu tactile du mot (« top 75% »)
      rise(
        document.querySelector<HTMLElement>("#contact h2"),
        { "--w": 200 },
        "#contact",
        "top 65%",
      );
      document.querySelectorAll<HTMLElement>("[data-fx]").forEach((host) => {
        wordFx(host, chars, pointer);
      });
      if (!pointer) ScrollTrigger.refresh(); // tactile : les mots data-fit ont pris leur taille finale
      if (pointer) magneticButtons();
      // Apparitions en dernier : si une étape plus haut échoue, rien ne reste caché
      lineReveals(false);
      return blockReveals(false);
    },
  );
  // Découpés : on peut les montrer (voir .js [data-split] dans site.css)
  gsap.set("[data-split]", { visibility: "visible" });
  document.documentElement.classList.remove("js");
});

/* ---------- 404 : le soleil-pupille cherche la page ---------- */
const lost = gsap.matchMedia();
lost.add("(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)", () => {
  const sun = document.querySelector<SVGSVGElement>("#lost-sun");
  const title = document.querySelector<HTMLElement>(".lost h1");
  if (!sun || !title) return;
  const rot = gsap.quickTo(sun, "rotation", { duration: 0.9, ease: "power3.out" });
  // Angle du centre du soleil vers un point ; la fente de la Pupille est à 45° au repos.
  // Le soleil part retourné (180°, fente vers le titre) : on tourne toujours par le plus court chemin
  let last = Number(gsap.getProperty(sun, "rotation")) || 180;
  const aim = (x: number, y: number) => {
    const r = sun.getBoundingClientRect();
    const a = (Math.atan2(y - (r.top + r.height / 2), x - (r.left + r.width / 2)) * 180) / Math.PI;
    last += ((((a - 45 - last) % 360) + 540) % 360) - 180;
    rot(last);
  };
  const toTitle = () => {
    const t = title.getBoundingClientRect();
    aim(t.left + t.width / 2, t.top + t.height / 2);
  };
  let idle = 0;
  const onMove = (e: PointerEvent) => {
    aim(e.clientX, e.clientY);
    window.clearTimeout(idle);
    idle = window.setTimeout(toTitle, 1200);
  };
  window.addEventListener("pointermove", onMove);
  document.documentElement.addEventListener("pointerleave", toTitle);
  return () => {
    window.removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("pointerleave", toTitle);
    window.clearTimeout(idle);
  };
});
