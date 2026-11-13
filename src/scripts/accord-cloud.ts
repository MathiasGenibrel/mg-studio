/* ---------- Bande Accord : une brume de points cache un cadenas ; le survol la disperse ----------
   ≈ 2 600 points (brume crème, sur un voile de dégradés doux, quelques grains d’encre) posés en cumulus et animés par ressort ;
   à l’entrée de la bande ils se rassemblent depuis l’éparpillement (g : 0 → 1). Au survol (p : 0 → 1) la brume s’écarte du
   centre, le curseur l’écarte aussi localement, le cadenas apparaît ouvert, puis son anse se transforme jusqu’à la fermeture
   (ressort) avec une pulsation, comme Face ID. En sortant, la brume revient, plus lentement qu’elle n’est partie.
   Tactile : révélé une fois à l’arrivée, puis au toucher. Mouvement réduit : image fixe, révélation instantanée. */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { $, M } from "./motion";

interface Dot {
  hx: number;
  hy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  sx: number;
  sy: number;
  ph: number;
  f: number;
  amp: number;
  r: number;
  c: string;
  a: number;
  j: number;
}

/** [x, y, rayon] en rayons de nuage */
const BLOBS: readonly (readonly [number, number, number])[] = [
  [0, 0.05, 1],
  [-0.5, 0.18, 0.68],
  [0.52, 0.2, 0.72],
  [-0.22, -0.28, 0.66],
  [0.25, -0.32, 0.6],
  [-0.85, 0.3, 0.42],
  [0.88, 0.32, 0.4],
];
const N = 2600;
/** Boîte du cadenas en unités locales (anse ouverte et dépassement du ressort compris) */
const BOX = { l: 70, t: 112, w: 140, h: 182 };

const gauss = (): number => {
  let u = 0,
    v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const dprOf = (): number => Math.min(2, devicePixelRatio || 1);

export function accordCloud(wrap: HTMLElement): void {
  const cv = $<HTMLCanvasElement>("canvas", wrap),
    hint = $(".ac-hint", wrap),
    msg = $(".ac-msg", wrap);
  const lk = document.createElement("canvas");
  const ctx = cv.getContext("2d"),
    lctx = lk.getContext("2d");
  if (!ctx || !lctx) return;
  const reducedQ = matchMedia("(prefers-reduced-motion: reduce)"),
    fineQ = matchMedia("(hover: hover) and (pointer: fine)");
  const st = { g: 0, p: 0, k: 0, b: 0 };
  let W = 0,
    H = 0,
    s = 1,
    Rc = 1,
    cx = 0,
    cy = 0,
    pts: Dot[] = [],
    lock = { x: 0, y: 0 },
    ptr: { x: number; y: number } | null = null,
    running = false;
  const t0 = performance.now();

  const build = () => {
    const r = wrap.getBoundingClientRect();
    W = r.width;
    H = r.height;
    s = H / 404;
    const dpr = dprOf();
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W / 2;
    cy = H * 0.53;
    Rc = Math.min(H * 0.42, W * 0.3); // le nuage et son voile tiennent dans la zone, même la masse du haut
    const total = BLOBS.reduce((a, b) => a + b[2] ** 2, 0);
    lock = { x: cx, y: cy + 6 * s };
    pts = Array.from({ length: N }, (): Dot => {
      let k = Math.random() * total,
        b = BLOBS[0] ?? ([0, 0, 1] as const);
      for (const bl of BLOBS) {
        k -= bl[2] ** 2;
        if (k <= 0) {
          b = bl;
          break;
        }
      }
      const hx = cx + (b[0] + gauss() * b[2] * 0.5) * Rc;
      let hy = cy + (b[1] + gauss() * b[2] * 0.46) * Rc;
      if (hy > cy + Rc * 0.5) hy = cy + Rc * 0.5 - (hy - cy - Rc * 0.5) * 0.5; // base aplatie, comme un cumulus
      const ang = Math.random() * Math.PI * 2,
        far = (1.2 + Math.random()) * Rc,
        light = Math.random() < 0.72;
      return {
        hx,
        hy,
        x: hx,
        y: hy,
        vx: 0,
        vy: 0,
        sx: Math.cos(ang) * far,
        sy: Math.sin(ang) * far * 0.6,
        ph: Math.random() * 6.283,
        f: 0.3 + Math.random() * 0.7,
        amp: (2 + Math.random() * 6) * s,
        r: (light ? 1 + Math.random() * 1.6 : 0.8 + Math.random() * 1.1) * s,
        c: light ? "246,238,221" : "20,15,10",
        a: light ? 0.35 + Math.random() * 0.5 : 0.25 + Math.random() * 0.35,
        j: 0.75 + Math.random() * 0.5, // bord de l’ouverture irrégulier
      };
    });
  };

  // Cadenas, comme Face ID : il apparaît ouvert, puis l’anse se transforme jusqu’à la position fermée (k : 0 → 1, ressort qui
  // dépasse) et le corps marque une pulsation (b). L’anse est recalculée à chaque image depuis k : hauteur de l’arc, longueur
  // de la jambe droite (libre quand c’est ouvert), légère bascule autour de la jambe gauche.
  // Le cadenas est dessiné opaque dans son propre calque (anse, corps, trou de serrure réellement découpé), puis ce calque est
  // posé en une fois avec l’opacité voulue : en fondu, l’anse et le corps ne se superposent jamais avec deux opacités.
  const shackle = (k: number) => {
    const arcY = -32 - (1 - k) * 22,
      rightEnd = arcY + 8 + (-14 - arcY - 8) * k;
    lctx.save();
    lctx.translate(-27, -14);
    lctx.rotate(-(1 - Math.min(1, k)) * 0.16);
    lctx.translate(27, 14); // bascule autour de la jambe gauche
    lctx.beginPath();
    lctx.moveTo(-27, -14);
    lctx.lineTo(-27, arcY);
    lctx.arc(0, arcY, 27, Math.PI, 0);
    lctx.lineTo(27, rightEnd);
    lctx.stroke();
    lctx.restore();
  };
  const drawLock = (p: number) => {
    if (p < 0.01) return;
    const U = s * dprOf() * 1.1; // 1,1 : marge pour la pulsation
    const pw = Math.ceil(BOX.w * U),
      ph = Math.ceil(BOX.h * U);
    if (lk.width !== pw || lk.height !== ph) {
      lk.width = pw;
      lk.height = ph;
    }
    const k = ((0.85 + 0.15 * p) * (1 + 0.07 * Math.sin(Math.PI * st.b))) / 1.1;
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.clearRect(0, 0, pw, ph);
    lctx.setTransform(U * k, 0, 0, U * k, BOX.l * U, BOX.t * U);
    lctx.strokeStyle = lctx.fillStyle = "#140F0A";
    lctx.lineWidth = 13;
    lctx.lineCap = "butt";
    shackle(st.k);
    lctx.beginPath();
    lctx.roundRect(-44, -20, 88, 72, 14);
    lctx.fill();
    lctx.globalCompositeOperation = "destination-out"; // trou de serrure découpé : on voit à travers
    lctx.beginPath();
    lctx.arc(0, 8, 9, 0, Math.PI * 2);
    lctx.fill();
    lctx.beginPath();
    lctx.roundRect(-4, 10, 8, 20, 3);
    lctx.fill();
    lctx.globalCompositeOperation = "source-over";
    ctx.save();
    ctx.globalAlpha = Math.min(1, p * 1.3);
    ctx.drawImage(
      lk,
      lock.x - BOX.l * s * 1.1,
      lock.y - BOX.t * s * 1.1,
      BOX.w * s * 1.1,
      BOX.h * s * 1.1,
    );
    ctx.restore();
  };

  const frame = () => {
    const now = (performance.now() - t0) / 1000,
      still = reducedQ.matches,
      p = st.p,
      g = st.g,
      Rclear = 110 * s;
    ctx.clearRect(0, 0, W, H);
    // voile de brume sous les points : un dégradé doux par masse du nuage, qui se dissipe avec eux
    for (const [bx, by, br] of BLOBS) {
      const x = cx + bx * Rc,
        y = cy + by * Rc,
        r = br * Rc * 1.15,
        gr = ctx.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(246,238,221,${(0.3 * g * (1 - 0.85 * p)).toFixed(3)})`);
      gr.addColorStop(1, "rgba(246,238,221,0)");
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.283);
      ctx.fill();
    }
    drawLock(p);
    for (const q of pts) {
      let tx = q.hx + (still ? 0 : Math.sin(now * q.f + q.ph) * q.amp),
        ty = q.hy + (still ? 0 : Math.cos(now * q.f * 0.8 + q.ph * 1.3) * q.amp * 0.7);
      const dx = tx - lock.x,
        dy = ty - lock.y,
        d = Math.hypot(dx, dy) || 1,
        push = Rclear * 1.35 * q.j * p * Math.exp(-d / (Rclear * 1.3 * q.j));
      tx += (dx / d) * push;
      ty += (dy / d) * push * 0.8; // la brume s’écarte du cadenas
      if (ptr) {
        const ex = tx - ptr.x,
          ey = ty - ptr.y,
          e = Math.hypot(ex, ey) || 1,
          R = 80 * s;
        if (e < R) {
          const f = (1 - e / R) ** 2 * 46 * s;
          tx += (ex / e) * f;
          ty += (ey / e) * f;
        }
      }
      tx += q.sx * (1 - g);
      ty += q.sy * (1 - g); // éparpillée avant l’entrée
      if (still) {
        q.x = tx;
        q.y = ty;
      } else {
        q.vx = (q.vx + (tx - q.x) * 0.07) * 0.8;
        q.vy = (q.vy + (ty - q.y) * 0.07) * 0.8;
        q.x += q.vx;
        q.y += q.vy;
      }
      const edge = gsap.utils.clamp(0, 1, Math.min(q.x, W - q.x, q.y, H - q.y) / 28); // fondu près des bords : aucun point coupé net
      ctx.fillStyle = `rgba(${q.c},${(q.a * g * edge).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.r, 0, 6.283);
      ctx.fill();
    }
    hint.style.opacity = ((1 - p) * g * 0.75).toFixed(2);
    msg.style.opacity = (p * g).toFixed(2);
  };
  // Boucle seulement quand la bande est visible et que le mouvement est permis ; sinon une image à la demande
  const start = () => {
    if (!running && !reducedQ.matches) {
      running = true;
      gsap.ticker.add(frame);
    }
  };
  const stop = () => {
    if (running) {
      running = false;
      gsap.ticker.remove(frame);
    }
  };
  const paint = () => {
    if (!running) frame();
  };

  build();
  new ResizeObserver(() => {
    build();
    paint();
  }).observe(wrap);
  if (reducedQ.matches) {
    st.g = 1;
    paint();
  }
  ScrollTrigger.create({
    trigger: wrap,
    start: "top bottom",
    end: "bottom top",
    onToggle: (t) => {
      if (t.isActive) start();
      else stop();
      paint();
    },
  });
  // Entrée et sortie, comme les visuels Pulse et Limitless : la brume se rassemble, puis se disperse quand la bande s’en va
  const gather = (v: 0 | 1) => {
    if (reducedQ.matches) {
      st.g = 1;
      paint();
      return;
    }
    gsap.to(st, {
      g: v,
      duration: v ? 1.6 : 0.9,
      ease: v ? M.out : "power2.in",
      overwrite: "auto",
    });
  };
  ScrollTrigger.create({
    trigger: wrap,
    start: "top 85%",
    end: "bottom 15%",
    onEnter: () => gather(1),
    onEnterBack: () => gather(1),
    onLeave: () => gather(0),
    onLeaveBack: () => gather(0),
  });

  const reveal = (v: 0 | 1) => {
    if (reducedQ.matches) {
      // mouvement réduit : cadenas directement fermé
      st.p = v;
      st.k = v;
      paint();
      return;
    }
    // la brume revient plus lentement qu’elle n’est partie
    gsap.to(st, {
      p: v,
      duration: v ? 1 : 1.6,
      ease: v ? M.out : "power2.inOut",
      overwrite: "auto",
    });
    if (v) {
      // ouvert à l’apparition, puis fermeture en ressort et pulsation du corps une fois la brume écartée
      gsap
        .timeline()
        .set(st, { k: 0, b: 0 })
        .to(st, { k: 1, duration: 0.55, ease: "back.out(2.6)" }, 0.5)
        .to(st, { b: 1, duration: 0.32, ease: "power1.inOut" }, 0.82);
    } else gsap.to(st, { k: 0, duration: 0.35, ease: "power2.in", delay: 0.2, overwrite: "auto" }); // il se rouvre en s’effaçant
  };
  const local = (e: PointerEvent) => {
    const r = cv.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  if (fineQ.matches) {
    cv.addEventListener("pointerenter", (e) => {
      ptr = local(e);
      reveal(1);
    });
    cv.addEventListener("pointermove", (e) => {
      ptr = local(e);
    });
    cv.addEventListener("pointerleave", () => {
      ptr = null;
      reveal(0);
    });
  } else {
    cv.addEventListener("click", () => reveal(st.p > 0.5 ? 0 : 1));
    ScrollTrigger.create({
      trigger: wrap,
      start: "top 60%",
      once: true,
      onEnter: () => {
        gsap.delayedCall(1.4, () => reveal(1));
        gsap.delayedCall(4.4, () => reveal(0));
      },
    });
  }
}
