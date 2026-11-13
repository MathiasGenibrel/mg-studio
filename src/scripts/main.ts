/* MG Studio · mouvement (GSAP + ScrollTrigger + SplitText, empaquetés par Astro : aucune requête tierce) */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { accordCloud } from "./accord-cloud";
import { magneticButtons, navAutoHide, wordFx } from "./common";
import { $, M } from "./motion";

gsap.registerPlugin(ScrollTrigger, SplitText);

void document.fonts.ready.then(init);

function init(): void {
  // Découpe en caractères : SplitText garde le texte complet en aria-label
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
  // Masque vertical pendant l'apparition, puis libéré pour que les survols puissent déborder
  const clipDuring = <T extends gsap.core.Animation>(el: Element, tween: T): T => {
    const masks = el.querySelectorAll(".line-mask");
    gsap.set(masks, { clipPath: "inset(-0.15em -100vw 0 -100vw)" });
    void tween.then(() => gsap.set(masks, { clipPath: "none" }));
    return tween;
  };

  navAutoHide();

  // Bande Accord : la brume qui cache un cadenas (hors matchMedia : elle gère elle-même le mouvement réduit et le tactile)
  const acWrap = document.querySelector<HTMLElement>(".ac-cloud");
  if (acWrap) accordCloud(acWrap);

  const mm = gsap.matchMedia();
  mm.add(
    {
      full: "(prefers-reduced-motion: no-preference)",
      reduced: "(prefers-reduced-motion: reduce)",
      pointer: "(hover: hover) and (pointer: fine)",
    },
    (ctx) => {
      const { reduced = false, pointer = false } = ctx.conditions ?? {};

      /* ---------- Version réduite : fondus courts, rien ne bouge ---------- */
      if (reduced) {
        gsap.utils.toArray<Element>("[data-split], [data-fade], [data-reveal]").forEach((el) => {
          gsap.from(el, {
            opacity: 0,
            duration: 0.2,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top 90%" },
          });
        });
        return;
      }

      /* ---------- 1. Entrée du hero (une fois) ---------- */
      const hero = $("#hero h1");
      const intro = gsap.timeline({ defaults: { ease: M.out } });
      clipDuring(hero, intro);
      intro
        .from(chars(hero), {
          yPercent: 110,
          "--w": 200,
          "--d": 75,
          duration: M.expressive,
          stagger: 0.028,
        })
        .from("#sun", { yPercent: 45, rotation: -35, duration: 1.4 }, 0.15)
        .from("#hero [data-fade]", { opacity: 0, duration: 0.45, ease: "none" }, 0.7);

      /* ---------- 2. Signature : le soleil-pupille regarde le visiteur ---------- */
      const sun = $<SVGSVGElement>("#sun");
      if (pointer) {
        const rot = gsap.quickTo(sun, "rotation", { duration: 0.9, ease: "power3.out" });
        window.addEventListener("pointermove", (e) => {
          const r = sun.getBoundingClientRect();
          const a =
            (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) *
              180) /
            Math.PI;
          rot(a - 45); // la fente de la Pupille est à 45° au repos
        });
      }
      // Parallaxe sur le conteneur, pas sur le SVG : l’entrée (§1) anime déjà le yPercent du SVG, et le tween de scroll
      // relèverait sa valeur de départ en pleine entrée (le soleil sauterait plus bas au premier scroll, sans jamais remonter)
      gsap.fromTo(
        $(".sun"),
        { yPercent: 0, scale: 1 },
        {
          yPercent: 35,
          scale: 0.85,
          ease: "none",
          scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true },
        },
      );

      /* ---------- 3. « Pour l’humain. » : les lettres s’ouvrent quand on approche ---------- */
      if (pointer) {
        const q = (c: HTMLElement, prop: string) =>
          gsap.quickTo(c, prop, { duration: 0.5, ease: "power3.out" });
        const hc = chars(hero).map((c) => ({
          c,
          w: q(c, "--w"),
          d: q(c, "--d"),
          y: q(c, "yPercent"),
        }));
        const RADIUS = 300;
        const heroSection = $("#hero");
        intro.eventCallback("onComplete", () => {
          hc.forEach((o) => {
            o.w(640);
            o.d(84);
          }); // repos : un peu plus fin et serré
          heroSection.addEventListener("pointermove", (e) => {
            hc.forEach((o) => {
              const r = o.c.getBoundingClientRect();
              const dist = Math.hypot(
                e.clientX - (r.left + r.width / 2),
                e.clientY - (r.top + r.height / 2),
              );
              const t = gsap.utils.clamp(0, 1, 1 - dist / RADIUS);
              o.w(640 + 160 * t);
              o.d(84 + 16 * t);
              o.y(-6 * t);
            });
          });
          heroSection.addEventListener("pointerleave", () =>
            hc.forEach((o) => {
              o.w(640);
              o.d(84);
              o.y(0);
            }),
          );
        });
      }

      /* ---------- 4. Manifeste : les mots prennent du corps au scroll ---------- */
      document.querySelectorAll("#manifeste .word").forEach((row) => {
        gsap.fromTo(
          chars($("h3", row)),
          { "--w": 200, "--d": 75, opacity: 0.15 },
          {
            "--w": 800,
            "--d": 100,
            opacity: 1,
            ease: "none",
            stagger: 0.06,
            scrollTrigger: { trigger: row, start: "top 85%", end: "top 35%", scrub: 0.6 },
          },
        );
        gsap.from($("p", row), {
          opacity: 0,
          duration: 0.5,
          ease: "none",
          scrollTrigger: { trigger: row, start: "top 70%" },
        });
      });

      /* ---------- 5. Survols : chaque mot joue son sens (src/scripts/fx.ts, branchés dans common.ts) ---------- */
      document.querySelectorAll<HTMLElement>("[data-fx]").forEach((host) => {
        wordFx(host, chars, pointer);
      });

      /* ---------- 6. Bandes produits : le nom défile avec le scroll ---------- */
      gsap.utils.toArray<HTMLElement>(".band h2").forEach((h) => {
        const band = h.closest("section");
        gsap.fromTo(
          h,
          { xPercent: 8 },
          {
            xPercent: -8,
            ease: "none",
            scrollTrigger: { trigger: band, start: "top bottom", end: "bottom top", scrub: true },
          },
        );
        clipDuring(
          h,
          gsap.from(chars(h), {
            yPercent: 100,
            duration: M.body,
            ease: M.out,
            stagger: 0.03,
            scrollTrigger: { trigger: band, start: "top 60%" },
          }),
        );
      });

      /* ---------- 7. Titres secondaires : lignes qui montent derrière un masque ---------- */
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        const s = SplitText.create(el, {
          type: "lines",
          linesClass: "line",
          mask: "lines",
          aria: "auto",
        });
        clipDuring(
          el,
          gsap.from(s.lines, {
            yPercent: 100,
            duration: M.body,
            ease: M.out,
            stagger: 0.08,
            scrollTrigger: { trigger: el, start: "top 80%" },
          }),
        );
      });
      const contactTitle = $("#contact h2");
      clipDuring(
        contactTitle,
        gsap.from(chars(contactTitle), {
          yPercent: 110,
          "--w": 200,
          duration: M.expressive,
          ease: M.out,
          stagger: 0.03,
          scrollTrigger: { trigger: "#contact", start: "top 65%" },
        }),
      );

      pulseTop();
      limitlessMenubar();
      bandVisuals();
      if (pointer) magneticButtons();
    },
  );
  // Les grands mots sont découpés et leur état de départ posé : on peut les montrer
  gsap.set("[data-split]", { visibility: "visible" });
  document.documentElement.classList.remove("js");
}

/** Relève les ScrollTrigger d’une section : vrai tant qu’elle est à l’écran */
function watchVisible(trigger: string): () => boolean {
  let visible = false;
  ScrollTrigger.create({
    trigger,
    start: "top bottom",
    end: "bottom top",
    onToggle: (s) => {
      visible = s.isActive;
    },
  });
  return () => visible;
}

/* ---------- 9. Bande Pulse : le classement des apps les plus gourmandes, en direct (simulation, un relevé par seconde comme l’app) ---------- */
function pulseTop(): void {
  const ptList = document.querySelector<HTMLOListElement>(".pulse-top ol");
  if (!ptList) return;
  const apps = [...ptList.querySelectorAll<HTMLElement>(".pt-row")].map((r) => ({
    r,
    c: Number(r.dataset.cpu),
    base: Number(r.dataset.base),
    spike: r.hasAttribute("data-spike"),
    bar: $(".pt-bar i", r),
    val: $(".pt-val", r),
  }));
  const rowH = apps[0]?.r.offsetHeight ?? 0;
  ptList.style.height = rowH * apps.length + "px";
  ptList.classList.add("is-live");
  apps.forEach((a, i) => gsap.set(a.r, { y: i * rowH }));
  let t = 7; // t = 7 : le premier relevé ouvre un pic, Node.js reste en tête à l’arrivée puis redescend
  const isVisible = watchVisible("#pulse");
  const reducedNow = matchMedia("(prefers-reduced-motion: reduce)");
  setInterval(() => {
    if (!isVisible() || reducedNow.matches) return;
    t++;
    const hot = t % 16 >= 8 && t % 16 < 14; // un pic de 6 s toutes les 16 s
    apps.forEach((a) => {
      const target = hot && a.spike ? 70 + Math.random() * 12 : a.base;
      a.c = gsap.utils.clamp(
        0.5,
        95,
        a.c + (target - a.c) * (hot && a.spike ? 0.55 : 0.3) + (Math.random() - 0.5) * 3,
      );
    });
    [...apps]
      .sort((x, y) => y.c - x.c)
      .forEach((a, rank) => {
        a.r.style.zIndex = String(10 - rank); // la mieux classée passe devant pendant l’échange
        gsap.to(a.r, { y: rank * rowH, duration: 0.55, ease: M.out, overwrite: "auto" });
        gsap.to(a.bar, {
          scaleX: Math.min(1, (a.c * 1.15) / 100),
          duration: 0.7,
          ease: M.out,
          overwrite: "auto",
        });
        a.val.textContent = Math.round(a.c) + " %";
        a.r.classList.toggle("is-hot", rank === 0 && a.c > 40);
      });
  }, 1000);
}

/* ---------- 10. Bande Limitless : l’extra de la barre des menus, en direct (simulation) ---------- */
function limitlessMenubar(): void {
  const accts = [...document.querySelectorAll<HTMLElement>(".lt-item")].map((el) => ({
    el,
    u: Number(el.dataset.u),
    rate: Number(el.dataset.rate),
    hold: 0,
    ring: $<SVGCircleElement>(".lt-ring", el),
    val: $(".lt-val", el),
  }));
  if (!accts.length) return;
  const isVisible = watchVisible("#limitless");
  const reducedNow = matchMedia("(prefers-reduced-motion: reduce)");
  setInterval(() => {
    if (!isVisible() || reducedNow.matches) return;
    accts.forEach((a) => {
      if (a.u >= 100) {
        // limite atteinte, tenue 3 relevés, puis la fenêtre se réinitialise
        if (++a.hold > 3) {
          a.u = Math.random() * 4;
          a.hold = 0;
        }
      } else a.u = Math.min(100, a.u + a.rate * (0.4 + Math.random() * 1.2) * 2.4);
      gsap.to(a.ring, {
        strokeDashoffset: 100 - a.u,
        duration: a.hold === 0 && a.u < 5 ? M.expressive : 0.8,
        ease: M.out,
        overwrite: "auto",
      });
      a.val.textContent = Math.round(a.u) + " %";
      a.el.classList.toggle("is-full", a.u >= 100);
    });
  }, 1200);
}

/* ---------- 11. Visuels des bandes produits : entrée et sortie au scroll, dans les deux sens ---------- */
function bandVisuals(): void {
  // Entrée à l’arrivée de la bande, sortie quand elle s’en va ; la sortie va 1,8 fois plus vite que l’entrée
  const enterExit = (el: Element, tl: gsap.core.Timeline) =>
    ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      end: "bottom 15%",
      onEnter: () => tl.timeScale(1).play(),
      onEnterBack: () => tl.timeScale(1).play(),
      onLeave: () => tl.timeScale(1.8).reverse(),
      onLeaveBack: () => tl.timeScale(1.8).reverse(),
    });
  const pt = document.querySelector(".pulse-top");
  if (pt)
    enterExit(
      pt,
      gsap
        .timeline({ paused: true, defaults: { ease: M.out } })
        .from($(".pt-head", pt), { opacity: 0, yPercent: 60, duration: M.body })
        // yPercent et non y : y porte le rang de chaque ligne (§9)
        .from(
          pt.querySelectorAll(".pt-row"),
          { opacity: 0, yPercent: 45, duration: M.body, stagger: 0.06 },
          0.1,
        )
        // la piste entière se déroule : la barre de valeur, elle, reste pilotée par les relevés
        .from(
          pt.querySelectorAll(".pt-bar"),
          { scaleX: 0, transformOrigin: "0% 50%", duration: M.expressive, stagger: 0.06 },
          0.2,
        ),
    );
  const lm = document.querySelector(".lt-menubar");
  if (lm)
    enterExit(
      lm,
      gsap
        .timeline({ paused: true, defaults: { ease: M.out } })
        // la barre s’ouvre de gauche à droite, comme un menu qui se déplie
        .fromTo(
          $(".lt-strip", lm),
          { clipPath: "inset(0% 100% 0% 0% round 1.2em)" },
          { clipPath: "inset(0% 0% 0% 0% round 1.2em)", duration: M.expressive },
        )
        .from($(".lt-mark", lm), { rotation: -90, scale: 0.6, opacity: 0, duration: M.body }, 0.15)
        .from(
          lm.querySelectorAll(".lt-item"),
          { opacity: 0, yPercent: 40, duration: M.body, stagger: 0.08 },
          0.25,
        )
        .from(
          lm.querySelectorAll(".lt-item svg"),
          {
            scale: 0.5,
            transformOrigin: "50% 50%",
            duration: M.body,
            ease: M.spring,
            stagger: 0.08,
          },
          0.3,
        )
        .from($(".lt-cap", lm), { opacity: 0, duration: M.base, ease: "none" }, 0.5),
    );
}
