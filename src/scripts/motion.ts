/* Tokens Motion (mêmes valeurs que la collection Figma « Motion ») : durées en secondes, courbes GSAP */
export const M = {
  fast: 0.14,
  base: 0.35,
  body: 0.6,
  expressive: 1.1,
  out: "expo.out",
  inOut: "power3.inOut",
  spring: "elastic.out(1, 0.45)",
  settle: "elastic.out(1, 0.3)",
} as const;

/** Effet de survol d’un grand mot : entrée, déplacement (coordonnées locales au mot) et sortie */
export interface FxApi {
  enter: () => void;
  move?: (x: number, y: number) => void;
  leave: () => void;
}

/** Premier élément correspondant au sélecteur ; lève une erreur s’il manque (balisage cassé) */
export function $<T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`Élément introuvable : ${sel}`);
  return el;
}

/** Fondu progressif : 0 → 1 entre deux bornes, adouci (smoothstep) */
export const smooth = (t: number): number => t * t * (3 - 2 * t);
