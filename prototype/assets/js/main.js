/* MG Studio · mouvement (GSAP 3.15.1 + ScrollTrigger + SplitText, servis en local dans assets/js) */
gsap.registerPlugin(ScrollTrigger, SplitText);

/* Tokens Motion (mêmes valeurs que la collection Figma « Motion ») */
const M = {
  fast: .14, base: .35, body: .6, expressive: 1.1,
  out: "expo.out", inOut: "power3.inOut", spring: "elastic.out(1, 0.45)", settle: "elastic.out(1, 0.3)"
};

document.fonts.ready.then(init);

function init(){
  // Découpe en caractères : SplitText garde le texte complet en aria-label
  const splits = new Map();
  document.querySelectorAll("[data-split]").forEach(el => {
    splits.set(el, SplitText.create(el, { type: "lines,chars", charsClass: "char", linesClass: "line", mask: "lines", aria: "auto" }));
  });
  const chars = el => splits.get(el).chars;
  // Masque vertical pendant l'apparition, puis libéré pour que les survols puissent déborder
  const clipDuring = (el, tween) => {
    const masks = el.querySelectorAll(".line-mask");
    gsap.set(masks, { clipPath: "inset(-0.15em -100vw 0 -100vw)" });
    tween.then(() => gsap.set(masks, { clipPath: "none" }));
    return tween;
  };

  // Navigation : se retire au scroll vers le bas, revient vers le haut (dans tous les modes ; sans transition en mouvement réduit)
  const nav = document.querySelector(".nav");
  ScrollTrigger.create({ start: 120, end: "max", onToggle: s => nav.classList.toggle("is-solid", s.isActive), onUpdate: s => nav.classList.toggle("is-hidden", s.direction === 1) });

  // Bande Accord : la brume qui cache un cadenas (hors matchMedia : elle gère elle-même le mouvement réduit et le tactile)
  const acWrap = document.querySelector(".ac-cloud");
  if (acWrap) accordCloud(acWrap);

  const mm = gsap.matchMedia();
  mm.add({
    full: "(prefers-reduced-motion: no-preference)",
    reduced: "(prefers-reduced-motion: reduce)",
    pointer: "(hover: hover) and (pointer: fine)"
  }, ctx => {
    const { full, reduced, pointer } = ctx.conditions;

    /* ---------- Version réduite : fondus courts, rien ne bouge ---------- */
    if (reduced) {
      gsap.utils.toArray("[data-split], [data-fade], [data-reveal]").forEach(el => {
        gsap.from(el, { opacity: 0, duration: .2, ease: "none", scrollTrigger: { trigger: el, start: "top 90%" } });
      });
      return;
    }

    /* ---------- 1. Entrée du hero (une fois) ---------- */
    const hero = document.querySelector("#hero h1");
    const intro = gsap.timeline({ defaults: { ease: M.out } });
    clipDuring(hero, intro);
    intro.from(chars(hero), { yPercent: 110, "--w": 200, "--d": 75, duration: M.expressive, stagger: .028 })
         .from("#sun", { yPercent: 45, rotation: -35, duration: 1.4 }, .15)
         .from("#hero [data-fade]", { opacity: 0, duration: .45, ease: "none" }, .7);

    /* ---------- 2. Signature : le soleil-pupille regarde le visiteur ---------- */
    const sun = document.querySelector("#sun");
    if (pointer) {
      const rot = gsap.quickTo(sun, "rotation", { duration: .9, ease: "power3.out" });
      window.addEventListener("pointermove", e => {
        const r = sun.getBoundingClientRect();
        const a = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
        rot(a - 45); // la fente de la Pupille est à 45° au repos
      });
    }
    gsap.to(sun, { yPercent: 35, scale: .85, ease: "none", scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true } });

    /* ---------- 3. « Pour l’humain. » : les lettres s’ouvrent quand on approche ---------- */
    if (pointer) {
      const hc = chars(hero).map(c => ({ c, w: gsap.quickTo(c, "--w", { duration: .5, ease: "power3.out" }), d: gsap.quickTo(c, "--d", { duration: .5, ease: "power3.out" }), y: gsap.quickTo(c, "yPercent", { duration: .5, ease: "power3.out" }) }));
      const RADIUS = 300;
      intro.eventCallback("onComplete", () => {
        hc.forEach(o => { o.w(640); o.d(84); }); // repos : un peu plus fin et serré
        document.querySelector("#hero").addEventListener("pointermove", e => {
          hc.forEach(o => {
            const r = o.c.getBoundingClientRect();
            const dist = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
            const t = gsap.utils.clamp(0, 1, 1 - dist / RADIUS);
            o.w(640 + 160 * t); o.d(84 + 16 * t); o.y(-6 * t);
          });
        });
        document.querySelector("#hero").addEventListener("pointerleave", () => hc.forEach(o => { o.w(640); o.d(84); o.y(0); }));
      });
    }

    /* ---------- 4. Manifeste : les mots prennent du corps au scroll ---------- */
    document.querySelectorAll("#manifeste .word").forEach(row => {
      const h = row.querySelector("h3");
      gsap.fromTo(chars(h), { "--w": 200, "--d": 75, opacity: .15 }, { "--w": 800, "--d": 100, opacity: 1, ease: "none", stagger: .06,
        scrollTrigger: { trigger: row, start: "top 85%", end: "top 35%", scrub: .6 } });
      gsap.from(row.querySelector("p"), { opacity: 0, duration: .5, ease: "none", scrollTrigger: { trigger: row, start: "top 70%" } });
    });

    /* ---------- 5. Survols : chaque mot joue son sens ---------- */
    const fx = {
      think(h, cs) { // Penser. : sous le curseur les lettres cherchent leurs mots ; elles passent par d’autres glyphes avant de retrouver le bon, d’autant plus vite qu’on est près
        const LOWER = "abcdefghijklmnopqrstuvwxyz?", UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ?";
        const st = cs.map(c => ({ c, ch: c.textContent, heat: 0, jit: 800, w: gsap.quickTo(c, "--w", { duration: .12, ease: "power2.out" }) }));
        let R = 150, p = null, on = false, ticking = false, frame = 0;
        const tick = () => {
          frame++;
          const hr = h.getBoundingClientRect(); let warm = false;
          st.forEach(o => {
            let t = 0;
            if (on && p) { const r = o.c.getBoundingClientRect(); t = gsap.utils.clamp(0, 1, 1 - Math.hypot(r.left + r.width / 2 - hr.left - p.x, r.top + r.height / 2 - hr.top - p.y) / R); t = t * t * (3 - 2 * t); }
            o.heat += (t - o.heat) * .2; if (o.heat > .01) warm = true;
            if (frame % 3) return; // une substitution tous les 3 tics (≈ 20 par seconde au plus)
            const pool = o.ch === o.ch.toUpperCase() ? UPPER : LOWER;
            const show = o.ch !== "." && Math.random() < o.heat * .85 ? pool[Math.floor(Math.random() * pool.length)] : o.ch;
            if (o.c.textContent !== show) o.c.textContent = show;
            o.w(800 - o.heat * (200 + Math.random() * 300)); // la graisse tremble entre 300 et 800
          });
          if (!on && !warm) { // tout est retombé : lettres justes, largeurs libérées
            gsap.ticker.remove(tick); ticking = false;
            st.forEach(o => { o.c.textContent = o.ch; o.w(800); o.c.style.width = ""; o.c.style.textAlign = ""; });
          }
        };
        return {
          enter: () => {
            on = true; R = parseFloat(getComputedStyle(h).fontSize) * .75; // 150 px pour un mot de 200 px
            if (!ticking) { // largeurs figées : une lettre de remplacement ne fait pas bouger le mot
              st.forEach(o => { o.c.textContent = o.ch; o.c.style.width = ""; });
              st.forEach(o => { o.c.style.width = o.c.getBoundingClientRect().width + "px"; o.c.style.textAlign = "center"; });
              ticking = true; gsap.ticker.add(tick);
            }
          },
          move: (x, y) => { p = { x, y }; },
          leave: () => { on = false; }
        };
      },
      draw(h, cs) { // Dessiner. : au survol le mot se creuse en contour ; un pinceau rond suit le curseur et remplit les lettres là où il passe. En sortant, l’encre finit le mot de gauche à droite
        // Trois couches par lettre (voir site.css) : contour (la lettre), fond plein ou creux (::before, qui couvre la moitié intérieure du contour et ses croisements), encre (::after, masquée par la trace)
        cs.forEach(c => { c.dataset.ch = c.textContent; });
        gsap.set(cs, { "--fill": "100%" });
        const EMPTY = "linear-gradient(transparent, transparent)"; // « none » ôterait le masque : l’encre serait partout
        const cells = new Map(); // trace : une touche par case de 0,2 R, bornée quel que soit le temps passé à peindre
        let R = 90, last = null, live = null, raf = 0, run = 0;
        const paint = () => {
          raf = 0; const hr = h.getBoundingClientRect();
          const dabs = live ? [...cells.values(), live] : [...cells.values()];
          cs.forEach(c => { // chaque lettre ne reçoit que les touches qui la recouvrent, en coordonnées locales
            const r = c.getBoundingClientRect(), ox = r.left - hr.left, oy = r.top - hr.top;
            const mine = dabs.filter(d => d.x + R > ox && d.x - R < ox + r.width && d.y + R > oy && d.y - R < oy + r.height);
            c.style.setProperty("--brush", mine.length ? mine.map(d => `radial-gradient(circle ${R.toFixed(0)}px at ${(d.x - ox).toFixed(1)}px ${(d.y - oy).toFixed(1)}px, #000 60%, transparent 100%)`).join(",") : EMPTY);
          });
        };
        const dab = (x, y) => { const k = `${Math.round(x / (R * .2))}:${Math.round(y / (R * .2))}`; if (!cells.has(k)) cells.set(k, { x, y }); };
        return {
          enter: () => {
            run++; last = live = null; cells.clear(); R = parseFloat(getComputedStyle(h).fontSize) * .45; // 90 px pour un mot de 200 px
            paint(); h.classList.add("is-drawing");
            gsap.to(cs, { "--fill": "0%", duration: .25, stagger: .015, ease: "power2.in", overwrite: "auto" });
          },
          move: (x, y) => {
            const p = last ?? { x, y }, n = Math.max(1, Math.ceil(Math.hypot(x - p.x, y - p.y) / (R * .25))); // touches rapprochées : un trait continu
            for (let i = 1; i <= n; i++) dab(p.x + (x - p.x) * i / n, p.y + (y - p.y) * i / n);
            last = { x, y }; live = { x, y }; // la touche vivante suit le curseur au pixel près, à chaque image
            if (!raf) raf = requestAnimationFrame(paint);
          },
          leave: () => {
            last = null; if (live) { dab(live.x, live.y); live = null; } const id = run;
            gsap.to(cs, { "--fill": "100%", duration: .7, stagger: .06, ease: M.inOut, overwrite: "auto",
              onComplete: () => { if (id !== run) return; h.classList.remove("is-drawing"); cells.clear(); paint(); } });
          }
        };
      },
      erase(h, cs) { // Effacer. : une gomme ronde suit le curseur, sa trace se referme derrière elle ; les lettres s’usent à son approche
        const R = parseFloat(getComputedStyle(h).fontSize) * .6, trail = []; let live = null, ticking = false; // 120 px pour un mot de 200 px
        const wear = cs.map(c => gsap.quickTo(c, "--w", { duration: .4, ease: "power3.out" }));
        const paint = () => {
          const holes = (live ? [...trail, live] : trail).filter(p => p.r > .5);
          if (!holes.length) { h.style.maskImage = ""; gsap.ticker.remove(paint); ticking = false; return; }
          h.style.maskImage = holes.map(p => `radial-gradient(circle ${p.r.toFixed(1)}px at ${p.x.toFixed(1)}px ${p.y.toFixed(1)}px, transparent 62%, #000 100%)`).join(",");
          h.style.maskComposite = "intersect";
        };
        const heal = p => gsap.to(p, { r: 0, duration: 1.1, delay: .35, ease: "power2.in", onComplete: () => trail.splice(trail.indexOf(p), 1) });
        return {
          enter: () => {},
          move: (x, y) => {
            if (!live) { live = { x, y, r: 0 }; gsap.to(live, { r: R, duration: M.base, ease: M.out }); }
            const last = trail[trail.length - 1];
            if (!last || Math.hypot(x - last.x, y - last.y) > 18) { // une empreinte tous les 18 px
              const p = { x, y, r: live.r }; trail.push(p); heal(p);
              if (trail.length > 32) gsap.killTweensOf(trail.shift());
            }
            live.x = x; live.y = y;
            if (!ticking) { ticking = true; gsap.ticker.add(paint); }
            const hr = h.getBoundingClientRect();
            cs.forEach((c, i) => { const r = c.getBoundingClientRect(); const t = gsap.utils.clamp(0, 1, 1 - Math.hypot(r.left + r.width / 2 - hr.left - x, r.top + r.height / 2 - hr.top - y) / (R * 2)); wear[i](800 - 480 * t); });
          },
          leave: () => {
            if (live) { gsap.killTweensOf(live); const p = live; live = null; trail.push(p); heal(p); }
            wear.forEach(w => w(800));
          }
        };
      },
      give(h, cs) { // Donner. : sous le curseur les lettres grandissent, s’épaississent et prennent le jaune ; les voisines s’écartent
        const R = parseFloat(getComputedStyle(h).fontSize) * 1.3, GROW = .42, REST = 520; // 260 px pour un mot de 200 px
        gsap.set(cs, { transformOrigin: "50% 100%" });
        const sq = c => [gsap.quickTo(c, "scaleX", { duration: .55, ease: "power3.out" }), gsap.quickTo(c, "scaleY", { duration: .55, ease: "power3.out" })];
        const q = cs.map(c => ({ c, s: (([a, b]) => v => { a(v); b(v); })(sq(c)), x: gsap.quickTo(c, "x", { duration: .55, ease: "power3.out" }),
          w: gsap.quickTo(c, "--w", { duration: .45, ease: "power3.out" }), t: gsap.quickTo(c, "--t", { duration: .45, ease: "power3.out" }) }));
        return {
          enter: () => {},
          move: (x, y) => {
            // Centres de mise en page (sans transformation) : largeurs cumulées depuis le début du mot.
            // Le mot est calé à droite : la croissance le pousse vers la gauche, la fin reste en place
            let cum = 0;
            const g = q.map(o => { const w = o.c.offsetWidth, cx = cum + w / 2; cum += w;
              const d = Math.hypot(cx - x, (y - h.offsetHeight / 2) * .5);
              const t = gsap.utils.clamp(0, 1, 1 - d / R), k = t * t * (3 - 2 * t); // smoothstep
              return { o, w, k, extra: GROW * k * w * 1.15 }; }); // 15 % d’air en plus : les lettres grossies ne se touchent pas
            const total = g.reduce((a, b) => a + b.extra, 0);
            let before = 0;
            g.forEach(({ o, k, extra }) => { o.s(1 + GROW * k); o.x(before + extra / 2 - total); before += extra; o.w(REST + (800 - REST) * k); o.t(k); });
          },
          leave: () => q.forEach(o => { o.s(1); o.x(0); o.w(800); o.t(0); })
        };
      },
      pulse(h, cs) { // Pulse : un battement parcourt le mot
        const beat = gsap.timeline({ repeat: -1, repeatDelay: .45, paused: true })
          .to(cs, { "--w": 300, scaleY: .9, transformOrigin: "50% 100%", duration: .1, stagger: .05, ease: "power2.in" })
          .to(cs, { "--w": 800, scaleY: 1, duration: .5, stagger: .05, ease: M.settle }, .12);
        return { enter: () => beat.restart(), leave: () => { beat.pause(); gsap.to(cs, { "--w": 800, scaleY: 1, duration: .3, ease: M.out }); } };
      },
      stretch(h, cs) { // Limitless : il s’étire jusqu’à dépasser le bord
        return {
          enter: () => gsap.to(cs, { "--d": 100, x: i => i * 10, duration: .8, ease: M.out, overwrite: "auto" }),
          leave: () => gsap.to(cs, { "--d": 75, x: 0, duration: 1, ease: M.spring, overwrite: "auto" })
        };
      },
      chord(h, cs) { // Accord : les lettres se désaccordent puis trouvent l’accord
        return {
          enter: () => gsap.timeline({ overwrite: "auto" })
            .to(cs, { yPercent: i => (i % 2 ? 9 : -9), rotation: i => (i % 2 ? 3 : -3), duration: .22, ease: "power2.out" })
            .to(cs, { yPercent: 0, rotation: 0, duration: 1.1, ease: M.settle, stagger: .04 }),
          leave: () => {}
        };
      },
      write(h, cs) { // Écrivez-nous. : l’écriture penche, le trait d’union s’allonge comme une plume
        const dash = cs.find(c => c.textContent === "-");
        return {
          enter: () => { gsap.to(cs, { skewX: -9, duration: .45, ease: M.out, stagger: .02, overwrite: "auto" }); dash && gsap.to(dash, { scaleX: 1.6, transformOrigin: "0% 50%", duration: .6, ease: M.out }); },
          leave: () => { gsap.to(cs, { skewX: 0, duration: .35, ease: M.out, overwrite: "auto" }); dash && gsap.to(dash, { scaleX: 1, duration: .35, ease: M.out }); }
        };
      }
    };
    document.querySelectorAll("[data-fx]").forEach(host => {
      const h = host.querySelector("[data-split]"); if (!h) return;
      const api = fx[host.dataset.fx](h, chars(h));
      if (pointer) {
        h.addEventListener("pointerenter", api.enter); h.addEventListener("pointerleave", api.leave);
        if (api.move) h.addEventListener("pointermove", e => { const r = h.getBoundingClientRect(); api.move(e.clientX - r.left, e.clientY - r.top); });
      } else ScrollTrigger.create({ trigger: h, start: "top 75%", once: true, onEnter: () => { // tactile : joué une fois à l’arrivée
        if (api.move) { api.enter(); const p = { x: 0 }; gsap.to(p, { x: h.offsetWidth, duration: 1.6, ease: "power1.inOut", onUpdate: () => api.move(p.x, h.offsetHeight / 2), onComplete: api.leave }); } // un curseur fictif balaie le mot
        else { api.enter(); gsap.delayedCall(1.6, api.leave); }
      } });
    });

    /* ---------- 6. Bandes produits : le nom défile avec le scroll ---------- */
    gsap.utils.toArray(".band h2").forEach(h => {
      gsap.fromTo(h, { xPercent: 8 }, { xPercent: -8, ease: "none", scrollTrigger: { trigger: h.closest("section"), start: "top bottom", end: "bottom top", scrub: true } });
      clipDuring(h, gsap.from(chars(h), { yPercent: 100, duration: M.body, ease: M.out, stagger: .03, scrollTrigger: { trigger: h.closest("section"), start: "top 60%" } }));
    });

    /* ---------- 7. Titres secondaires : lignes qui montent derrière un masque ---------- */
    gsap.utils.toArray("[data-reveal]").forEach(el => {
      const s = SplitText.create(el, { type: "lines", linesClass: "line", mask: "lines", aria: "auto" });
      clipDuring(el, gsap.from(s.lines, { yPercent: 100, duration: M.body, ease: M.out, stagger: .08, scrollTrigger: { trigger: el, start: "top 80%" } }));
    });
    const contactTitle = document.querySelector("#contact h2");
    clipDuring(contactTitle, gsap.from(chars(contactTitle), { yPercent: 110, "--w": 200, duration: M.expressive, ease: M.out, stagger: .03, scrollTrigger: { trigger: "#contact", start: "top 65%" } }));

    /* ---------- 9. Bande Pulse : le classement des apps les plus gourmandes, en direct (simulation, un relevé par seconde comme l’app) ---------- */
    const ptList = document.querySelector(".pulse-top ol");
    if (ptList) {
      const apps = [...ptList.children].map(r => ({ r, c: +r.dataset.cpu, base: +r.dataset.base, spike: r.hasAttribute("data-spike"), bar: r.querySelector(".pt-bar i"), val: r.querySelector(".pt-val") }));
      const rowH = apps[0].r.offsetHeight;
      ptList.style.height = rowH * apps.length + "px"; ptList.classList.add("is-live");
      apps.forEach((a, i) => gsap.set(a.r, { y: i * rowH }));
      let t = 7, visible = false; // t = 7 : le premier relevé ouvre un pic, Node.js reste en tête à l’arrivée puis redescend
      ScrollTrigger.create({ trigger: "#pulse", start: "top bottom", end: "bottom top", onToggle: s => { visible = s.isActive; } });
      const reducedNow = matchMedia("(prefers-reduced-motion: reduce)");
      setInterval(() => {
        if (!visible || reducedNow.matches) return; t++;
        const hot = t % 16 >= 8 && t % 16 < 14; // un pic de 6 s toutes les 16 s
        apps.forEach(a => { const target = hot && a.spike ? 70 + Math.random() * 12 : a.base;
          a.c = gsap.utils.clamp(.5, 95, a.c + (target - a.c) * (hot && a.spike ? .55 : .3) + (Math.random() - .5) * 3); });
        [...apps].sort((x, y) => y.c - x.c).forEach((a, rank) => {
          a.r.style.zIndex = String(10 - rank); // la mieux classée passe devant pendant l’échange
          gsap.to(a.r, { y: rank * rowH, duration: .55, ease: M.out, overwrite: "auto" });
          gsap.to(a.bar, { scaleX: Math.min(1, a.c * 1.15 / 100), duration: .7, ease: M.out, overwrite: "auto" });
          a.val.textContent = Math.round(a.c) + "\u202f%";
          a.r.classList.toggle("is-hot", rank === 0 && a.c > 40);
        });
      }, 1000);
    }

    /* ---------- 10. Bande Limitless : l’extra de la barre des menus, en direct (simulation) ---------- */
    const ltItems = [...document.querySelectorAll(".lt-item")];
    if (ltItems.length) {
      const accts = ltItems.map(el => ({ el, u: +el.dataset.u, rate: +el.dataset.rate, hold: 0, ring: el.querySelector(".lt-ring"), val: el.querySelector(".lt-val") }));
      let visible = false;
      ScrollTrigger.create({ trigger: "#limitless", start: "top bottom", end: "bottom top", onToggle: s => { visible = s.isActive; } });
      const reducedNow = matchMedia("(prefers-reduced-motion: reduce)");
      setInterval(() => {
        if (!visible || reducedNow.matches) return;
        accts.forEach(a => {
          if (a.u >= 100) { if (++a.hold > 3) { a.u = Math.random() * 4; a.hold = 0; } } // limite atteinte, tenue 3 relevés, puis la fenêtre se réinitialise
          else a.u = Math.min(100, a.u + a.rate * (.4 + Math.random() * 1.2) * 2.4);
          gsap.to(a.ring, { strokeDashoffset: 100 - a.u, duration: a.hold === 0 && a.u < 5 ? M.expressive : .8, ease: M.out, overwrite: "auto" });
          a.val.textContent = Math.round(a.u) + "\u202f%";
          a.el.classList.toggle("is-full", a.u >= 100);
        });
      }, 1200);
    }

    /* ---------- 11. Visuels des bandes produits : entrée et sortie au scroll, dans les deux sens ---------- */
    // Entrée à l’arrivée de la bande, sortie quand elle s’en va ; la sortie va 1,8 fois plus vite que l’entrée
    const enterExit = (el, tl) => ScrollTrigger.create({ trigger: el, start: "top 85%", end: "bottom 15%",
      onEnter: () => tl.timeScale(1).play(), onEnterBack: () => tl.timeScale(1).play(),
      onLeave: () => tl.timeScale(1.8).reverse(), onLeaveBack: () => tl.timeScale(1.8).reverse() });
    const pt = document.querySelector(".pulse-top");
    if (pt) enterExit(pt, gsap.timeline({ paused: true, defaults: { ease: M.out } })
      .from(pt.querySelector(".pt-head"), { opacity: 0, yPercent: 60, duration: M.body })
      // yPercent et non y : y porte le rang de chaque ligne (§9)
      .from(pt.querySelectorAll(".pt-row"), { opacity: 0, yPercent: 45, duration: M.body, stagger: .06 }, .1)
      // la piste entière se déroule : la barre de valeur, elle, reste pilotée par les relevés
      .from(pt.querySelectorAll(".pt-bar"), { scaleX: 0, transformOrigin: "0% 50%", duration: M.expressive, stagger: .06 }, .2));
    const lm = document.querySelector(".lt-menubar");
    if (lm) enterExit(lm, gsap.timeline({ paused: true, defaults: { ease: M.out } })
      // la barre s’ouvre de gauche à droite, comme un menu qui se déplie
      .fromTo(lm.querySelector(".lt-strip"), { clipPath: "inset(0% 100% 0% 0% round 1.2em)" }, { clipPath: "inset(0% 0% 0% 0% round 1.2em)", duration: M.expressive })
      .from(lm.querySelector(".lt-mark"), { rotation: -90, scale: .6, opacity: 0, duration: M.body }, .15)
      .from(lm.querySelectorAll(".lt-item"), { opacity: 0, yPercent: 40, duration: M.body, stagger: .08 }, .25)
      .from(lm.querySelectorAll(".lt-item svg"), { scale: .5, transformOrigin: "50% 50%", duration: M.body, ease: M.spring, stagger: .08 }, .3)
      .from(lm.querySelector(".lt-cap"), { opacity: 0, duration: M.base, ease: "none" }, .5));

    /* ---------- 8. Boutons : attraction magnétique et libellé qui roule ---------- */
    if (pointer) document.querySelectorAll(".btn").forEach(b => {
      const x = gsap.quickTo(b, "x", { duration: .4, ease: "power3.out" }), y = gsap.quickTo(b, "y", { duration: .4, ease: "power3.out" });
      const [a, c] = b.querySelectorAll(".roll > span");
      // Le CSS cache le second libellé par translateY(110%) (sans JS, en mouvement réduit) ; GSAP lirait ce décalage comme un y en px
      // et l’ajouterait à yPercent : le libellé ne remonterait jamais. On le remet à zéro et on passe par yPercent seul
      gsap.set(c, { y: 0, yPercent: 110 });
      b.addEventListener("pointermove", e => { const r = b.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * .25); y((e.clientY - r.top - r.height / 2) * .35); });
      b.addEventListener("pointerenter", () => { gsap.to(a, { yPercent: -110, duration: M.base, ease: M.out }); gsap.fromTo(c, { yPercent: 110 }, { yPercent: 0, duration: M.base, ease: M.out }); });
      b.addEventListener("pointerleave", () => { x(0); y(0); gsap.to(a, { yPercent: 0, duration: M.base, ease: M.out }); gsap.to(c, { yPercent: 110, duration: M.base, ease: M.out }); });
    });
  });
  // Les grands mots sont découpés et leur état de départ posé : on peut les montrer
  gsap.set("[data-split]", { visibility: "visible" });
  document.documentElement.classList.remove("js");
}

/* ---------- Bande Accord : une brume de points cache un cadenas ; le survol la disperse ----------
   ≈ 2 600 points (brume crème, sur un voile de dégradés doux, quelques grains d’encre) posés en cumulus et animés par ressort ; à l’entrée de la bande ils se
   rassemblent depuis l’éparpillement (g : 0 → 1). Au survol (p : 0 → 1) la brume s’écarte du centre, le curseur l’écarte aussi
   localement, le cadenas apparaît ouvert, puis son anse se transforme jusqu’à la fermeture (ressort) avec une pulsation, comme Face ID. En sortant, la brume revient, plus lentement qu’elle n’est partie.
   Tactile : révélé une fois à l’arrivée, puis au toucher. Mouvement réduit : image fixe, révélation instantanée. */
function accordCloud(wrap) {
  const cv = wrap.querySelector("canvas"), ctx = cv.getContext("2d"), hint = wrap.querySelector(".ac-hint"), msg = wrap.querySelector(".ac-msg");
  const reducedQ = matchMedia("(prefers-reduced-motion: reduce)"), fineQ = matchMedia("(hover: hover) and (pointer: fine)");
  const N = 2600, st = { g: 0, p: 0, k: 0, b: 0 };
  const BLOBS = [[0, .05, 1], [-.5, .18, .68], [.52, .2, .72], [-.22, -.28, .66], [.25, -.32, .6], [-.85, .3, .42], [.88, .32, .4]]; // [x, y, rayon] en rayons de nuage
  let W = 0, H = 0, s = 1, Rc = 1, cx = 0, cy = 0, pts = [], lock = { x: 0, y: 0 }, ptr = null, running = false, visible = false;
  const t0 = performance.now();
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  const build = () => {
    const r = wrap.getBoundingClientRect(); W = r.width; H = r.height; s = H / 404;
    const dpr = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W / 2; cy = H * .53; Rc = Math.min(H * .42, W * .3); // le nuage et son voile tiennent dans la zone, même la masse du haut
    const total = BLOBS.reduce((a, b) => a + b[2] ** 2, 0);
    lock = { x: cx, y: cy + 6 * s };
    pts = Array.from({ length: N }, () => {
      let k = Math.random() * total, b = BLOBS[0];
      for (const bl of BLOBS) { k -= bl[2] ** 2; if (k <= 0) { b = bl; break; } }
      const hx = cx + (b[0] + gauss() * b[2] * .5) * Rc; let hy = cy + (b[1] + gauss() * b[2] * .46) * Rc;
      if (hy > cy + Rc * .5) hy = cy + Rc * .5 - (hy - cy - Rc * .5) * .5; // base aplatie, comme un cumulus
      const ang = Math.random() * Math.PI * 2, far = (1.2 + Math.random()) * Rc, light = Math.random() < .72;
      return { hx, hy, x: hx, y: hy, vx: 0, vy: 0, sx: Math.cos(ang) * far, sy: Math.sin(ang) * far * .6, ph: Math.random() * 6.283, f: .3 + Math.random() * .7,
        amp: (2 + Math.random() * 6) * s, r: (light ? 1 + Math.random() * 1.6 : .8 + Math.random() * 1.1) * s,
        c: light ? "246,238,221" : "20,15,10", a: light ? .35 + Math.random() * .5 : .25 + Math.random() * .35, j: .75 + Math.random() * .5 }; // j : bord de l’ouverture irrégulier
    });
  };

  // Cadenas, comme Face ID : il apparaît ouvert, puis l’anse se transforme jusqu’à la position fermée (k : 0 → 1, ressort qui
  // dépasse) et le corps marque une pulsation (b). L’anse est recalculée à chaque image depuis k : hauteur de l’arc, longueur
  // de la jambe droite (libre quand c’est ouvert), légère bascule autour de la jambe gauche.
  // Le cadenas est dessiné opaque dans son propre calque (anse, corps, trou de serrure réellement découpé), puis ce calque est
  // posé en une fois avec l’opacité voulue : en fondu, l’anse et le corps ne se superposent jamais avec deux opacités.
  const lk = document.createElement("canvas"), lctx = lk.getContext("2d");
  const BOX = { l: 70, t: 112, w: 140, h: 182 }; // boîte du cadenas en unités locales (anse ouverte et dépassement du ressort compris)
  const shackle = k => {
    const arcY = -32 - (1 - k) * 22, rightEnd = arcY + 8 + (-14 - arcY - 8) * k;
    lctx.save(); lctx.translate(-27, -14); lctx.rotate(-(1 - Math.min(1, k)) * .16); lctx.translate(27, 14); // bascule autour de la jambe gauche
    lctx.beginPath(); lctx.moveTo(-27, -14); lctx.lineTo(-27, arcY); lctx.arc(0, arcY, 27, Math.PI, 0); lctx.lineTo(27, rightEnd); lctx.stroke(); lctx.restore();
  };
  const drawLock = p => {
    if (p < .01) return;
    const dpr = Math.min(2, devicePixelRatio || 1), U = s * dpr * 1.1; // 1,1 : marge pour la pulsation
    const pw = Math.ceil(BOX.w * U), ph = Math.ceil(BOX.h * U);
    if (lk.width !== pw || lk.height !== ph) { lk.width = pw; lk.height = ph; }
    const k = (.85 + .15 * p) * (1 + .07 * Math.sin(Math.PI * st.b)) / 1.1;
    lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.clearRect(0, 0, pw, ph);
    lctx.setTransform(U * k, 0, 0, U * k, BOX.l * U, BOX.t * U);
    lctx.strokeStyle = lctx.fillStyle = "#140F0A"; lctx.lineWidth = 13; lctx.lineCap = "butt";
    shackle(st.k);
    lctx.beginPath(); lctx.roundRect(-44, -20, 88, 72, 14); lctx.fill();
    lctx.globalCompositeOperation = "destination-out"; // trou de serrure découpé : on voit à travers
    lctx.beginPath(); lctx.arc(0, 8, 9, 0, Math.PI * 2); lctx.fill(); lctx.beginPath(); lctx.roundRect(-4, 10, 8, 20, 3); lctx.fill();
    lctx.globalCompositeOperation = "source-over";
    ctx.save(); ctx.globalAlpha = Math.min(1, p * 1.3);
    ctx.drawImage(lk, lock.x - BOX.l * s * 1.1, lock.y - BOX.t * s * 1.1, BOX.w * s * 1.1, BOX.h * s * 1.1);
    ctx.restore();
  };

  const frame = () => {
    const now = (performance.now() - t0) / 1000, still = reducedQ.matches, p = st.p, g = st.g, Rclear = 110 * s;
    ctx.clearRect(0, 0, W, H);
    // voile de brume sous les points : un dégradé doux par masse du nuage, qui se dissipe avec eux
    for (const [bx, by, br] of BLOBS) {
      const x = cx + bx * Rc, y = cy + by * Rc, r = br * Rc * 1.15, gr = ctx.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(246,238,221,${(.3 * g * (1 - .85 * p)).toFixed(3)})`); gr.addColorStop(1, "rgba(246,238,221,0)");
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    }
    drawLock(p);
    for (const q of pts) {
      let tx = q.hx + (still ? 0 : Math.sin(now * q.f + q.ph) * q.amp), ty = q.hy + (still ? 0 : Math.cos(now * q.f * .8 + q.ph * 1.3) * q.amp * .7);
      const dx = tx - lock.x, dy = ty - lock.y, d = Math.hypot(dx, dy) || 1, push = Rclear * 1.35 * q.j * p * Math.exp(-d / (Rclear * 1.3 * q.j));
      tx += dx / d * push; ty += dy / d * push * .8; // la brume s’écarte du cadenas
      if (ptr) { const ex = tx - ptr.x, ey = ty - ptr.y, e = Math.hypot(ex, ey) || 1, R = 80 * s; if (e < R) { const f = (1 - e / R) ** 2 * 46 * s; tx += ex / e * f; ty += ey / e * f; } }
      tx += q.sx * (1 - g); ty += q.sy * (1 - g); // éparpillée avant l’entrée
      if (still) { q.x = tx; q.y = ty; } else { q.vx = (q.vx + (tx - q.x) * .07) * .8; q.vy = (q.vy + (ty - q.y) * .07) * .8; q.x += q.vx; q.y += q.vy; }
      const edge = gsap.utils.clamp(0, 1, Math.min(q.x, W - q.x, q.y, H - q.y) / 28); // fondu près des bords : aucun point coupé net
      ctx.fillStyle = `rgba(${q.c},${(q.a * g * edge).toFixed(3)})`; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.283); ctx.fill();
    }
    hint.style.opacity = ((1 - p) * g * .75).toFixed(2); msg.style.opacity = (p * g).toFixed(2);
  };
  // Boucle seulement quand la bande est visible et que le mouvement est permis ; sinon une image à la demande
  const start = () => { if (!running && !reducedQ.matches) { running = true; gsap.ticker.add(frame); } };
  const stop = () => { if (running) { running = false; gsap.ticker.remove(frame); } };
  const paint = () => { if (!running) frame(); };

  build();
  new ResizeObserver(() => { build(); paint(); }).observe(wrap);
  if (reducedQ.matches) { st.g = 1; paint(); }
  ScrollTrigger.create({ trigger: wrap, start: "top bottom", end: "bottom top", onToggle: t => { visible = t.isActive; visible ? start() : stop(); paint(); } });
  // Entrée et sortie, comme les visuels Pulse et Limitless : la brume se rassemble, puis se disperse quand la bande s’en va
  const gather = v => reducedQ.matches ? (st.g = 1, paint()) : gsap.to(st, { g: v, duration: v ? 1.6 : .9, ease: v ? M.out : "power2.in", overwrite: "auto" });
  ScrollTrigger.create({ trigger: wrap, start: "top 85%", end: "bottom 15%", onEnter: () => gather(1), onEnterBack: () => gather(1), onLeave: () => gather(0), onLeaveBack: () => gather(0) });

  const reveal = v => {
    if (reducedQ.matches) { st.p = v; st.k = v; paint(); return; } // mouvement réduit : cadenas directement fermé
    gsap.to(st, { p: v, duration: v ? 1 : 1.6, ease: v ? M.out : "power2.inOut", overwrite: "auto" }); // la brume revient plus lentement qu’elle n’est partie
    if (v) { // ouvert à l’apparition, puis fermeture en ressort et pulsation du corps une fois la brume écartée
      gsap.timeline({ overwrite: "auto" }).set(st, { k: 0, b: 0 })
        .to(st, { k: 1, duration: .55, ease: "back.out(2.6)" }, .5)
        .to(st, { b: 1, duration: .32, ease: "power1.inOut" }, .82);
    } else gsap.to(st, { k: 0, duration: .35, ease: "power2.in", delay: .2, overwrite: "auto" }); // il se rouvre en s’effaçant
  };
  const local = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  if (fineQ.matches) {
    cv.addEventListener("pointerenter", e => { ptr = local(e); reveal(1); });
    cv.addEventListener("pointermove", e => { ptr = local(e); });
    cv.addEventListener("pointerleave", () => { ptr = null; reveal(0); });
  } else {
    cv.addEventListener("click", () => reveal(st.p > .5 ? 0 : 1));
    ScrollTrigger.create({ trigger: wrap, start: "top 60%", once: true, onEnter: () => { gsap.delayedCall(1.4, () => reveal(1)); gsap.delayedCall(4.4, () => reveal(0)); } });
  }
}

