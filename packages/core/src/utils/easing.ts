/**
 * Evaluation of CSS timing functions, for the frames a JavaScript tween has to
 * draw itself.
 *
 * The Web Animations API applies `animation-timing-function` for us, so this is
 * needed only where WAAPI cannot animate the property at all — the overlay's
 * cutout on engines without the CSS `d` property. Sampling the same easing the
 * sibling WAAPI animation uses keeps the cutout, the backdrop opacity and the
 * popover moving as one.
 */

/** Maps linear time in `[0, 1]` to eased progress. */
export type EasingFunction = (progress: number) => number;

const LINEAR: EasingFunction = (progress) => progress;

/** The control points CSS assigns to each timing-function keyword. */
const KEYWORD_CONTROL_POINTS: Readonly<Record<string, readonly [number, number, number, number]>> =
  {
    ease: [0.25, 0.1, 0.25, 1],
    "ease-in": [0.42, 0, 1, 1],
    "ease-in-out": [0.42, 0, 0.58, 1],
    "ease-out": [0, 0, 0.58, 1],
    linear: [0, 0, 1, 1],
  };

const CUBIC_BEZIER = /^cubic-bezier\(([^)]*)\)$/;

/**
 * Compiles a CSS easing string into a function.
 *
 * Anything this does not understand — `steps()`, `linear()` with stops, a
 * custom `<easing-function>` from a newer spec level — falls back to linear
 * rather than throwing: a tween that eases differently is a cosmetic
 * difference, a tween that never runs is the bug being fixed.
 */
export function cssEasing(easing: string | undefined): EasingFunction {
  const value = easing?.trim().toLowerCase();
  if (!value) return LINEAR;

  const keyword = KEYWORD_CONTROL_POINTS[value];
  if (keyword) return cubicBezierEasing(...keyword);

  const match = CUBIC_BEZIER.exec(value);
  if (!match?.[1]) return LINEAR;
  const points = match[1].split(",").map((part) => Number(part.trim()));
  if (points.length !== 4 || points.some((point) => !Number.isFinite(point))) return LINEAR;

  const [x1, y1, x2, y2] = points as [number, number, number, number];
  return cubicBezierEasing(x1, y1, x2, y2);
}

/**
 * A cubic Bézier easing with the fixed endpoints CSS mandates, `(0,0)` and
 * `(1,1)`. `x` is inverted by bisection — slower than Newton-Raphson but
 * monotonic and unconditionally convergent, and 24 halvings on a unit interval
 * land well inside a subpixel for the geometry this drives.
 */
function cubicBezierEasing(x1: number, y1: number, x2: number, y2: number): EasingFunction {
  if (x1 === y1 && x2 === y2) return LINEAR;

  return (progress) => {
    if (!(progress > 0)) return 0;
    if (progress >= 1) return 1;

    let low = 0;
    let high = 1;
    let t = progress;
    for (let iteration = 0; iteration < 24; iteration += 1) {
      if (cubicBezierComponent(x1, x2, t) < progress) low = t;
      else high = t;
      t = (low + high) / 2;
    }
    return cubicBezierComponent(y1, y2, t);
  };
}

/** One axis of a cubic Bézier whose outer control points are 0 and 1. */
function cubicBezierComponent(first: number, second: number, t: number) {
  const inverse = 1 - t;
  return 3 * inverse * inverse * t * first + 3 * inverse * t * t * second + t * t * t;
}
