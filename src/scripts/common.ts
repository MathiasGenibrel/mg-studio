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

/** Masque vertical pendant une apparition, puis libéré pour que les survols puissent déborder */
export function clipDuring<T extends gsap.core.Animation>(el: Element, tween: T): T {
  const masks = el.querySelectorAll(".line-mask");
  gsap.set(masks, { clipPath: "inset(-0.15em -100vw 0 -100vw)" });
  void tween.then(() => gsap.set(masks, { clipPath: "none" }));
  return tween;
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

/** Largeur du mot au repos (graisse 800, chasse 100, sans transformation), quel que soit l'état de ses animations :
    on mesure une copie invisible, placée à côté et découpée lettre par lettre comme l'original */
function restWidth(h: HTMLElement): number {
  const copy = h.cloneNode(true) as HTMLElement;
  Object.assign(copy.style, {
    position: "absolute",
    left: "-9999px",
    top: "0",
    visibility: "hidden",
    fontSize: getComputedStyle(h).fontSize,
  });
  const cs = [...copy.querySelectorAll<HTMLElement>(".char")];
  cs.forEach((c) => {
    c.style.transform = "none";
    c.style.setProperty("--w", "800");
    c.style.setProperty("--d", "100");
  });
  h.after(copy); // à côté de l'original : mêmes règles héritées de l'hôte (les calques de Dessiner. élargissent les lettres)
  const first = cs[0],
    last = cs.at(-1);
  const w =
    first && last ? last.getBoundingClientRect().right - first.getBoundingClientRect().left : 0;
  copy.remove();
  return w;
}

/** Tactile : la taille finale du mot (hôte marqué data-fit) est posée dès le départ, en vw (elle suit l'orientation),
    et un scale le ramène à sa taille de repos ; la croissance au scroll ne touche plus la mise en page.
    Renvoie l'échelle de départ (1 : rien à faire) */
function fitNow(host: HTMLElement, h: HTMLElement): number {
  const box = host.closest("section") ?? host;
  const bs = getComputedStyle(box);
  const avail = box.clientWidth - parseFloat(bs.paddingLeft) - parseFloat(bs.paddingRight);
  const size = parseFloat(getComputedStyle(h).fontSize);
  const width = restWidth(h);
  if (!width || !avail) return 1;
  const target = (size * avail * 0.96) / width; // 4 % de marge : certains effets débordent un peu (Donner. s'étire)
  const from = size / target;
  if (Math.abs(from - 1) < 0.01) return 1;
  // Mots calés à droite (Dessiner., Donner. : .word.right, align-self: flex-end en mobile) : ils grandissent vers la gauche
  const right = host.classList.contains("right") || getComputedStyle(h).alignSelf === "flex-end";
  // Par gsap.set, taille comprise : le contexte gsap.matchMedia la retire s'il est annulé (trackpad branché sur un iPad)
  gsap.set(h, {
    fontSize: `${(target / window.innerWidth) * 100}vw`,
    scale: from,
    transformOrigin: right ? "100% 50%" : "0% 50%",
  });
  return from;
}

/** Branche l’effet du mot (data-fx sur l’hôte, data-split sur le titre) : survol à la souris, joué une fois à l’arrivée au tactile.
    `before` (tactile) : une apparition du mot à laisser finir avant sa mise à l'échelle, pour ne pas les superposer */
export function wordFx(
  host: HTMLElement,
  chars: (el: Element) => HTMLElement[],
  pointer: boolean,
  before?: gsap.core.Animation,
): void {
  const h = host.querySelector<HTMLElement>("[data-split]");
  const make = fx[host.dataset.fx ?? ""];
  if (!h || !make) return;
  // Construit tout de suite : certains effets posent l’état de repos des lettres (Dessiner. et ses calques)
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
    return;
  }

  // Tactile : joué une fois à l’arrivée
  const play = (): void => {
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
  };
  const from = host.hasAttribute("data-fit") ? fitNow(host, h) : 1;
  ScrollTrigger.create({
    trigger: h,
    start: "top 75%",
    once: true,
    onEnter: () => {
      const grow = (): void => {
        if (from === 1) return play();
        gsap.to(h, {
          scale: 1,
          duration: M.body,
          ease: M.out,
          clearProps: "transform",
          onComplete: play,
        });
      };
      if (before && before.progress() < 1) void before.then(grow);
      else grow();
    },
  });
}
