export function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function requiredStr(formData: FormData, key: string, label = key): string {
  const value = str(formData, key);
  if (!value) throw new Error(`Pole „${label}“ je povinné.`);
  return value;
}

export function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}
