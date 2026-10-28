export function hashCode(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

export function rotationFor(input: string, seed = 0): number {
  const value = hashCode(`${input}:${seed}`) % 9;
  return (value - 4) * 0.5;
}

export function pickFrom<T>(items: readonly T[], input: string, seed = 0): T {
  return items[hashCode(`${input}:${seed}`) % items.length] as T;
}
