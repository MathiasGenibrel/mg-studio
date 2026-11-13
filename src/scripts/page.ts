/* MG Studio · pages secondaires (mentions légales, vie privée, services, 404) : navigation, boutons, grands mots,
   sommaire, questions et soleil de la 404 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { magneticButtons, navAutoHide, wordFx } from "./common";

gsap.registerPlugin(ScrollTrigger, SplitText);

navAutoHide();

/* ---------- Services : questions ouvertes en desktop, repliées en mobile (on les ouvre au toucher) ---------- */
if (window.matchMedia("(max-width: 900px)").matches)
  document.querySelectorAll<HTMLDetailsElement>(".sv-qs details").forEach((d) => {
    d.open = false;
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
      pointer: "(hover: hover) and (pointer: fine)",
    },
    (ctx) => {
      const { full = false, pointer = false } = ctx.conditions ?? {};
      if (!full) return; // mouvement réduit : les mots restent immobiles
      document.querySelectorAll<HTMLElement>("[data-fx]").forEach((host) => {
        wordFx(host, chars, pointer);
      });
      if (pointer) magneticButtons();
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
