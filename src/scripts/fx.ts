/* Survols des grands mots : chaque mot joue son sens (README § Mouvement, §5) */
import { gsap } from "gsap";
import { M, smooth, type FxApi } from "./motion";

type Fx = (h: HTMLElement, cs: HTMLElement[]) => FxApi;
type Quick = ReturnType<typeof gsap.quickTo>;
interface Point {
  x: number;
  y: number;
}

const fontSize = (el: Element): number => parseFloat(getComputedStyle(el).fontSize);

/** Penser. : sous le curseur les lettres cherchent leurs mots ; elles passent par d’autres glyphes avant de retrouver le bon, d’autant plus vite qu’on est près */
const think: Fx = (h, cs) => {
  const LOWER = "abcdefghijklmnopqrstuvwxyz?",
    UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ?";
  const st = cs.map((c) => ({
    c,
    ch: c.textContent ?? "",
    heat: 0,
    w: gsap.quickTo(c, "--w", { duration: 0.12, ease: "power2.out" }),
  }));
  let R = 150,
    p: Point | null = null,
    on = false,
    ticking = false,
    frame = 0;
  const tick = () => {
    frame++;
    const hr = h.getBoundingClientRect();
    let warm = false;
    st.forEach((o) => {
      let t = 0;
      if (on && p) {
        const r = o.c.getBoundingClientRect();
        t = gsap.utils.clamp(
          0,
          1,
          1 -
            Math.hypot(r.left + r.width / 2 - hr.left - p.x, r.top + r.height / 2 - hr.top - p.y) /
              R,
        );
        t = smooth(t);
      }
      o.heat += (t - o.heat) * 0.2;
      if (o.heat > 0.01) warm = true;
      if (frame % 3) return; // une substitution tous les 3 tics (≈ 20 par seconde au plus)
      const pool = o.ch === o.ch.toUpperCase() ? UPPER : LOWER;
      const show =
        o.ch !== "." && Math.random() < o.heat * 0.85
          ? pool.charAt(Math.floor(Math.random() * pool.length))
          : o.ch;
      if (o.c.textContent !== show) o.c.textContent = show;
      o.w(800 - o.heat * (200 + Math.random() * 300)); // la graisse tremble entre 300 et 800
    });
    if (!on && !warm) {
      // tout est retombé : lettres justes, largeurs libérées
      gsap.ticker.remove(tick);
      ticking = false;
      st.forEach((o) => {
        o.c.textContent = o.ch;
        o.w(800);
        o.c.style.width = "";
        o.c.style.textAlign = "";
      });
    }
  };
  return {
    enter: () => {
      on = true;
      R = fontSize(h) * 0.75; // 150 px pour un mot de 200 px
      if (!ticking) {
        // largeurs figées : une lettre de remplacement ne fait pas bouger le mot
        st.forEach((o) => {
          o.c.textContent = o.ch;
          o.c.style.width = "";
        });
        st.forEach((o) => {
          o.c.style.width = o.c.getBoundingClientRect().width + "px";
          o.c.style.textAlign = "center";
        });
        ticking = true;
        gsap.ticker.add(tick);
      }
    },
    move: (x, y) => {
      p = { x, y };
    },
    leave: () => {
      on = false;
    },
  };
};

/** Dessiner. : au survol le mot se creuse en contour ; un pinceau rond suit le curseur et remplit les lettres là où il passe. En sortant, l’encre finit le mot de gauche à droite */
const draw: Fx = (h, cs) => {
  // Trois couches par lettre (voir site.css) : contour (la lettre), fond plein ou creux (::before, qui couvre la moitié
  // intérieure du contour et ses croisements), encre (::after, masquée par la trace)
  cs.forEach((c) => {
    c.dataset.ch = c.textContent ?? "";
  });
  gsap.set(cs, { "--fill": "100%" });
  const EMPTY = "linear-gradient(transparent, transparent)"; // « none » ôterait le masque : l’encre serait partout
  const cells = new Map<string, Point>(); // trace : une touche par case de 0,2 R, bornée quel que soit le temps passé à peindre
  let R = 90,
    last: Point | null = null,
    live: Point | null = null,
    raf = 0,
    run = 0;
  const paint = () => {
    raf = 0;
    const hr = h.getBoundingClientRect();
    const dabs = live ? [...cells.values(), live] : [...cells.values()];
    cs.forEach((c) => {
      // chaque lettre ne reçoit que les touches qui la recouvrent, en coordonnées locales
      const r = c.getBoundingClientRect(),
        ox = r.left - hr.left,
        oy = r.top - hr.top;
      const mine = dabs.filter(
        (d) => d.x + R > ox && d.x - R < ox + r.width && d.y + R > oy && d.y - R < oy + r.height,
      );
      c.style.setProperty(
        "--brush",
        mine.length
          ? mine
              .map(
                (d) =>
                  `radial-gradient(circle ${R.toFixed(0)}px at ${(d.x - ox).toFixed(1)}px ${(d.y - oy).toFixed(1)}px, #000 60%, transparent 100%)`,
              )
              .join(",")
          : EMPTY,
      );
    });
  };
  const dab = (x: number, y: number) => {
    const k = `${Math.round(x / (R * 0.2))}:${Math.round(y / (R * 0.2))}`;
    if (!cells.has(k)) cells.set(k, { x, y });
  };
  return {
    enter: () => {
      run++;
      last = live = null;
      cells.clear();
      R = fontSize(h) * 0.45; // 90 px pour un mot de 200 px
      paint();
      h.classList.add("is-drawing");
      gsap.to(cs, {
        "--fill": "0%",
        duration: 0.25,
        stagger: 0.015,
        ease: "power2.in",
        overwrite: "auto",
      });
    },
    move: (x, y) => {
      const p = last ?? { x, y },
        n = Math.max(1, Math.ceil(Math.hypot(x - p.x, y - p.y) / (R * 0.25))); // touches rapprochées : un trait continu
      for (let i = 1; i <= n; i++) dab(p.x + ((x - p.x) * i) / n, p.y + ((y - p.y) * i) / n);
      last = { x, y };
      live = { x, y }; // la touche vivante suit le curseur au pixel près, à chaque image
      if (!raf) raf = requestAnimationFrame(paint);
    },
    leave: () => {
      last = null;
      if (live) {
        dab(live.x, live.y);
        live = null;
      }
      const id = run;
      gsap.to(cs, {
        "--fill": "100%",
        duration: 0.7,
        stagger: 0.06,
        ease: M.inOut,
        overwrite: "auto",
        onComplete: () => {
          if (id !== run) return;
          h.classList.remove("is-drawing");
          cells.clear();
          paint();
        },
      });
    },
  };
};

/** Effacer. : une gomme ronde suit le curseur, sa trace se referme derrière elle ; les lettres s’usent à son approche */
const erase: Fx = (h, cs) => {
  interface Hole extends Point {
    r: number;
  }
  const R = fontSize(h) * 0.6, // 120 px pour un mot de 200 px
    trail: Hole[] = [];
  let live: Hole | null = null,
    ticking = false;
  const wear = cs.map((c) => gsap.quickTo(c, "--w", { duration: 0.4, ease: "power3.out" }));
  const paint = () => {
    const holes = (live ? [...trail, live] : trail).filter((p) => p.r > 0.5);
    if (!holes.length) {
      h.style.maskImage = "";
      gsap.ticker.remove(paint);
      ticking = false;
      return;
    }
    h.style.maskImage = holes
      .map(
        (p) =>
          `radial-gradient(circle ${p.r.toFixed(1)}px at ${p.x.toFixed(1)}px ${p.y.toFixed(1)}px, transparent 62%, #000 100%)`,
      )
      .join(",");
    h.style.maskComposite = "intersect";
  };
  const heal = (p: Hole) =>
    gsap.to(p, {
      r: 0,
      duration: 1.1,
      delay: 0.35,
      ease: "power2.in",
      onComplete: () => {
        trail.splice(trail.indexOf(p), 1);
      },
    });
  return {
    enter: () => {},
    move: (x, y) => {
      if (!live) {
        live = { x, y, r: 0 };
        gsap.to(live, { r: R, duration: M.base, ease: M.out });
      }
      const last = trail.at(-1);
      if (!last || Math.hypot(x - last.x, y - last.y) > 18) {
        // une empreinte tous les 18 px
        const p = { x, y, r: live.r };
        trail.push(p);
        heal(p);
        const oldest = trail.length > 32 ? trail.shift() : undefined;
        if (oldest) gsap.killTweensOf(oldest);
      }
      live.x = x;
      live.y = y;
      if (!ticking) {
        ticking = true;
        gsap.ticker.add(paint);
      }
      const hr = h.getBoundingClientRect();
      cs.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const t = gsap.utils.clamp(
          0,
          1,
          1 -
            Math.hypot(r.left + r.width / 2 - hr.left - x, r.top + r.height / 2 - hr.top - y) /
              (R * 2),
        );
        wear[i]?.(800 - 480 * t);
      });
    },
    leave: () => {
      if (live) {
        gsap.killTweensOf(live);
        const p = live;
        live = null;
        trail.push(p);
        heal(p);
      }
      wear.forEach((w) => w(800));
    },
  };
};

/** Donner. : sous le curseur les lettres grandissent, s’épaississent et prennent le jaune ; les voisines s’écartent */
const give: Fx = (h, cs) => {
  const R = fontSize(h) * 1.3, // 260 px pour un mot de 200 px
    GROW = 0.42,
    REST = 520;
  gsap.set(cs, { transformOrigin: "50% 100%" });
  const quick = (c: HTMLElement, prop: string, duration: number): Quick =>
    gsap.quickTo(c, prop, { duration, ease: "power3.out" });
  const q = cs.map((c) => {
    const sx = quick(c, "scaleX", 0.55),
      sy = quick(c, "scaleY", 0.55);
    return {
      c,
      s: (v: number) => {
        sx(v);
        sy(v);
      },
      x: quick(c, "x", 0.55),
      w: quick(c, "--w", 0.45),
      t: quick(c, "--t", 0.45),
    };
  });
  return {
    enter: () => {},
    move: (x, y) => {
      // Centres de mise en page (sans transformation) : largeurs cumulées depuis le début du mot.
      // Le mot est calé à droite : la croissance le pousse vers la gauche, la fin reste en place
      let cum = 0;
      const g = q.map((o) => {
        const w = o.c.offsetWidth,
          cx = cum + w / 2;
        cum += w;
        const d = Math.hypot(cx - x, (y - h.offsetHeight / 2) * 0.5);
        const k = smooth(gsap.utils.clamp(0, 1, 1 - d / R));
        return { o, k, extra: GROW * k * w * 1.15 }; // 15 % d’air en plus : les lettres grossies ne se touchent pas
      });
      const total = g.reduce((a, b) => a + b.extra, 0);
      let before = 0;
      g.forEach(({ o, k, extra }) => {
        o.s(1 + GROW * k);
        o.x(before + extra / 2 - total);
        before += extra;
        o.w(REST + (800 - REST) * k);
        o.t(k);
      });
    },
    leave: () =>
      q.forEach((o) => {
        o.s(1);
        o.x(0);
        o.w(800);
        o.t(0);
      }),
  };
};

/** Pulse : un battement parcourt le mot */
const pulse: Fx = (_h, cs) => {
  const beat = gsap
    .timeline({ repeat: -1, repeatDelay: 0.45, paused: true })
    .to(cs, {
      "--w": 300,
      scaleY: 0.9,
      transformOrigin: "50% 100%",
      duration: 0.1,
      stagger: 0.05,
      ease: "power2.in",
    })
    .to(cs, { "--w": 800, scaleY: 1, duration: 0.5, stagger: 0.05, ease: M.settle }, 0.12);
  return {
    enter: () => beat.restart(),
    leave: () => {
      beat.pause();
      gsap.to(cs, { "--w": 800, scaleY: 1, duration: 0.3, ease: M.out });
    },
  };
};

/** Limitless : il s’étire jusqu’à dépasser le bord */
const stretch: Fx = (_h, cs) => ({
  enter: () => {
    gsap.to(cs, {
      "--d": 100,
      x: (i: number) => i * 10,
      duration: 0.8,
      ease: M.out,
      overwrite: "auto",
    });
  },
  leave: () => {
    gsap.to(cs, { "--d": 75, x: 0, duration: 1, ease: M.spring, overwrite: "auto" });
  },
});

/** Accord : les lettres se désaccordent puis trouvent l’accord */
const chord: Fx = (_h, cs) => ({
  enter: () => {
    gsap
      .timeline()
      .to(cs, {
        yPercent: (i: number) => (i % 2 ? 9 : -9),
        rotation: (i: number) => (i % 2 ? 3 : -3),
        duration: 0.22,
        ease: "power2.out",
      })
      .to(cs, { yPercent: 0, rotation: 0, duration: 1.1, ease: M.settle, stagger: 0.04 });
  },
  leave: () => {},
});

/** Écrivez-moi. : l’écriture penche, le trait d’union s’allonge comme une plume */
const write: Fx = (_h, cs) => {
  const dash = cs.find((c) => c.textContent === "-");
  return {
    enter: () => {
      gsap.to(cs, { skewX: -9, duration: 0.45, ease: M.out, stagger: 0.02, overwrite: "auto" });
      if (dash)
        gsap.to(dash, { scaleX: 1.6, transformOrigin: "0% 50%", duration: 0.6, ease: M.out });
    },
    leave: () => {
      gsap.to(cs, { skewX: 0, duration: 0.35, ease: M.out, overwrite: "auto" });
      if (dash) gsap.to(dash, { scaleX: 1, duration: 0.35, ease: M.out });
    },
  };
};

export const fx: Record<string, Fx | undefined> = {
  think,
  draw,
  erase,
  give,
  pulse,
  stretch,
  chord,
  write,
};
