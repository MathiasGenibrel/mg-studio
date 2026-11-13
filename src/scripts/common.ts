/* MG Studio · comportements partagés par toutes les pages (accueil, mentions légales, 404) */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { fx } from "./fx";
import { $, M } from "./motion";

gsap.registerPlugin(ScrollTrigger);

/** Navigation : se retire au scroll vers le bas, revient vers le haut (dans tous les modes ; sans transition en mouvement réduit) */
export function navAutoHide(): void {
  const nav = $(".nav");
  // Sur une page courte (404, sans défilement), « max » vaut moins que 120 : ScrollTrigger signale alors un état actif
  // et une direction descendante dès le chargement. On s’en tient donc à la position réelle du défilement
  const past = () => window.scrollY > 120;
  ScrollTrigger.create({
    start: 120,
    end: "max",
    onToggle: (s) => nav.classList.toggle("is-solid", s.isActive && past()),
    onUpdate: (s) => nav.classList.toggle("is-hidden", s.direction === 1 && past()),
  });
}

/* ---------- 8. Boutons : attraction magnétique et libellé qui roule ---------- */
export function magneticButtons(): void {
  document.querySelectorAll<HTMLElement>(".btn").forEach((b) => {
    const x = gsap.quickTo(b, "x", { duration: 0.4, ease: "power3.out" }),
      y = gsap.quickTo(b, "y", { duration: 0.4, ease: "power3.out" });
    const [a, c] = b.querySelectorAll(".roll > span");
    if (!a || !c) return;
    // Le CSS cache le second libellé par translateY(110%) (sans JS, en mouvement réduit) ; GSAP lirait ce décalage comme un y en px
    // et l’ajouterait à yPercent : le libellé ne remonterait jamais. On le remet à zéro et on passe par yPercent seul
    gsap.set(c, { y: 0, yPercent: 110 });
    b.addEventListener("pointermove", (e) => {
      const r = b.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * 0.25);
      y((e.clientY - r.top - r.height / 2) * 0.35);
    });
    b.addEventListener("pointerenter", () => {
      gsap.to(a, { yPercent: -110, duration: M.base, ease: M.out });
      gsap.fromTo(c, { yPercent: 110 }, { yPercent: 0, duration: M.base, ease: M.out });
    });
    b.addEventListener("pointerleave", () => {
      x(0);
      y(0);
      gsap.to(a, { yPercent: 0, duration: M.base, ease: M.out });
      gsap.to(c, { yPercent: 110, duration: M.base, ease: M.out });
    });
  });
}

/* ---------- 5. Survols : chaque mot joue son sens (src/scripts/fx.ts) ---------- */
/** Branche l’effet du mot (data-fx sur l’hôte, data-split sur le titre) : survol à la souris, joué une fois à l’arrivée au tactile */
export function wordFx(
  host: HTMLElement,
  chars: (el: Element) => HTMLElement[],
  pointer: boolean,
): void {
  const h = host.querySelector<HTMLElement>("[data-split]");
  const make = fx[host.dataset.fx ?? ""];
  if (!h || !make) return;
  const api = make(h, chars(h));
  if (pointer) {
    h.addEventListener("pointerenter", api.enter);
    h.addEventListener("pointerleave", api.leave);
    const move = api.move;
    if (move)
      h.addEventListener("pointermove", (e) => {
        const r = h.getBoundingClientRect();
        move(e.clientX - r.left, e.clientY - r.top);
      });
  } else
    ScrollTrigger.create({
      trigger: h,
      start: "top 75%",
      once: true,
      onEnter: () => {
        // tactile : joué une fois à l’arrivée
        api.enter();
        const move = api.move;
        if (move) {
          // un curseur fictif balaie le mot
          const p = { x: 0 };
          gsap.to(p, {
            x: h.offsetWidth,
            duration: 1.6,
            ease: "power1.inOut",
            onUpdate: () => move(p.x, h.offsetHeight / 2),
            onComplete: api.leave,
          });
        } else gsap.delayedCall(1.6, api.leave);
      },
    });
}
