export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

export function normalize(dx: number, dy: number): { x: number; y: number } {
  const length = Math.hypot(dx, dy);
  if (length <= 0.0001) {
    return { x: 1, y: 0 };
  }
  return { x: dx / length, y: dy / length };
}
