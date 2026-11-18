/* MG Studio · apparitions partagées (accueil, services, pages légales, 404).
   Au scroll : [data-in] (un bloc), [data-in-stagger] (ses enfants directs, l'un après l'autre), [data-reveal] (titre :
   lignes qui montent derrière un masque). Jamais sur un .btn (l'aimant pilote x/y), ni sur un élément dont le
   transform a une transition CSS.
   À l'arrivée (en-tête des pages autres que l'accueil) : [data-intro], [data-intro-stagger], voir pageIntro.
   Rien n'est caché par le CSS : l'état de départ est posé ici, et ce qui est déjà à l'écran à l'initialisation
   (haut de page, retour arrière, ancre, cible d'une transition de vue) reste tel quel */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { clipDuring } from "./common";
import { M } from "./motion";

gsap.registerPlugin(ScrollTrigger, SplitText);

const BLOCKS = "[data-in], [data-in-stagger] > *";
/** clamp() : les blocs du bas de page (pied) se déclenchent même si la page ne défile pas assez loin */
const START = "clamp(top 88%)";

/** Retour ou avance dans l'historique (hors bfcache) : Safari peut restaurer le défilement tard, vers « load », après
    l'initialisation. Mesuré à scrollY = 0, tout ce qui est sous le hero serait caché alors que la vue restaurée (et
    l'instantané de la transition de vue) le montre déjà : rien n'est caché sur ces navigations */
const restored =
  (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)
    ?.type === "back_forward";

/** Déjà apparus : gsap.matchMedia rejoue ses fonctions quand une condition change en cours de visite (trackpad branché
    sur un iPad, mouvement réduit basculé) ; ce qui est déjà apparu n'est ni recaché ni rejoué */
const done = new WeakSet<Element>();

/** Déjà à l'écran, ou dépassé, au moment de l'initialisation (toujours vrai au retour dans l'historique) */
export const seen = (el: Element): boolean =>
  restored || el.getBoundingClientRect().top < window.innerHeight;

/** Bas de page atteint, mesuré en direct : sur iOS, la barre d'adresse qui se replie raccourcit le défilement maximal
    après la mesure de ScrollTrigger, et un départ clamp() peut devenir hors d'atteinte */
const atBottom = (): boolean =>
  window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;

/** Blocs : fondu + montée (mouvement réduit : fondu seul). Renvoie le nettoyage (écouteurs) */
export function blockReveals(reduced: boolean): () => void {
  const els = gsap.utils.toArray<HTMLElement>(BLOCKS).filter((el) => !done.has(el) && !seen(el));
  if (!els.length) return () => {};
  // Opacité de repos (certains blocs sont à 0,7 en CSS) : rendue à la fin par clearProps
  const rest = new Map(els.map((el) => [el, Number(getComputedStyle(el).opacity) || 1]));
  const y = reduced ? 0 : window.matchMedia("(max-width: 900px)").matches ? 16 : 24;
  gsap.set(els, { opacity: 0, y });

  const show = (batch: Element[]): void => {
    const todo = batch.filter((el) => !done.has(el));
    if (!todo.length) return;
    todo.forEach((el) => done.add(el));
    gsap.to(todo, {
      opacity: (_i: number, el: HTMLElement) => rest.get(el) ?? 1,
      y: 0,
      duration: reduced ? 0.2 : M.body,
      ease: reduced ? "none" : M.out,
      stagger: reduced ? 0 : 0.07,
      clearProps: "opacity,transform",
    });
  };
  ScrollTrigger.batch(els, { start: START, once: true, interval: 0.1, batchMax: 6, onEnter: show });

  // Filet de sécurité : en bas de page, tout ce qui attend encore apparaît
  const onScroll = (): void => {
    if (!atBottom()) return;
    show(els);
    window.removeEventListener("scroll", onScroll);
  };
  window.addEventListener("scroll", onScroll, { passive: true });

  // Clavier : un lien encore caché qui reçoit le focus apparaît aussitôt (opacité seule : il reste dans l'ordre de tabulation)
  const onFocus = (e: FocusEvent): void => {
    const el = (e.target as Element | null)?.closest?.(BLOCKS);
    if (!el || !rest.has(el as HTMLElement)) return;
    done.add(el);
    gsap.killTweensOf(el);
    gsap.set(el, { clearProps: "opacity,transform" });
  };
  document.addEventListener("focusin", onFocus);
  return () => {
    document.removeEventListener("focusin", onFocus);
    window.removeEventListener("scroll", onScroll);
  };
}

/** Titres [data-reveal] : lignes qui montent derrière un masque, découpage retiré à la fin ; d'ici là, autoSplit
    redécoupe les lignes si la largeur change (rotation, redimensionnement). Mouvement réduit : fondu seul */
export function lineReveals(reduced: boolean): void {
  gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
    if (done.has(el) || seen(el)) return;
    if (reduced) {
      gsap.from(el, {
        opacity: 0,
        duration: 0.2,
        ease: "none",
        scrollTrigger: { trigger: el, start: "clamp(top 90%)", once: true },
        onComplete: () => void done.add(el),
      });
      return;
    }
    SplitText.create(el, {
      type: "lines",
      linesClass: "line",
      mask: "lines",
      aria: "auto",
      autoSplit: true,
      // L'animation renvoyée est reprise par SplitText à chaque redécoupage, à la même progression
      onSplit: (self) => {
        const tween = gsap.from(self.lines, {
          yPercent: 100,
          duration: M.body,
          ease: M.out,
          stagger: 0.08,
          scrollTrigger: { trigger: el, start: "clamp(top 80%)", once: true },
        });
        // Après la fin (microtâche), pas dans son propre onComplete : revert() annule aussi l'animation
        void tween.then(() => {
          done.add(el);
          self.revert();
        });
        return clipDuring(el, tween);
      },
    });
  });
}

/** En-tête des pages autres que l'accueil, joué à l'arrivée : le titre (data-intro="title") monte ligne par ligne
    derrière un masque, le soleil de la 404 (data-intro="sun") se lève, le reste ([data-intro], enfants de
    [data-intro-stagger]) suit en fondu montant, dans l'ordre du document. Caché par le CSS tant que .js est là
    (site.css) : à appeler avant que page.ts ne retire .js. `late` : .js déjà retiré (polices lentes, plus de 3 s),
    l'en-tête est affiché au repos et n'est pas rejoué */
let introPlayed = false;
export function pageIntro(reduced: boolean, late: boolean): void {
  // Une fois par page : gsap.matchMedia rejoue sa fonction si une condition change (trackpad, mouvement réduit)
  if (introPlayed) return;
  introPlayed = true;
  const title = document.querySelector<HTMLElement>('[data-intro="title"]');
  const sun = document.querySelector<HTMLElement>('[data-intro="sun"]');
  const items = gsap.utils
    .toArray<HTMLElement>("[data-intro], [data-intro-stagger] > *")
    .filter((el) => el !== title && el !== sun);
  if (late || (!title && !sun && !items.length)) return;
  const all = [title, sun, ...items].filter((el): el is HTMLElement => !!el);

  if (reduced) {
    gsap.from(all, { opacity: 0, duration: 0.2, ease: "none" });
    return;
  }

  const tl = gsap.timeline({ defaults: { ease: M.out } });
  if (title) {
    const s = SplitText.create(title, {
      type: "lines",
      linesClass: "line",
      mask: "lines",
      aria: "auto",
    });
    tl.from(s.lines, { yPercent: 105, duration: M.expressive, stagger: 0.1 }, 0.05);
    // Découpage retiré à la fin : pas de lignes figées après une rotation ou un redimensionnement
    void clipDuring(title, tl).then(() => s.revert());
  }
  // Le soleil part du bas (la 404 : « s'est couchée ») ; sur son conteneur, le SVG est tourné par le pointeur
  if (sun) tl.from(sun, { yPercent: 18, opacity: 0, duration: 1.4 }, 0);
  // Fondu montant ; les boutons en fondu seul (l'aimant pilote leur x/y)
  items.forEach((el, i) => {
    const btn = el.classList.contains("btn");
    tl.from(
      el,
      { opacity: 0, y: btn ? 0 : 16, duration: M.body, clearProps: "opacity,transform" },
      0.15 + i * 0.06,
    );
  });
}
