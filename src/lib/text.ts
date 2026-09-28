// minuscules, sans accents ni ponctuation
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function slugify(value: string): string {
  return normalize(value).replace(/\s+/g, "-").slice(0, 80) || "element";
}

// sert à repérer quelqu'un qui s'inscrit deux fois au même événement
export function dedupeKey(firstName: string, lastName: string): string {
  return `${normalize(lastName)}|${normalize(firstName)}`;
}

// juste la première lettre ("jean-paul" donne "Jean-paul")
export function capitalize(value: string): string {
  const v = value.trim();
  return v.charAt(0).toLocaleUpperCase("fr-FR") + v.slice(1);
}

export function fullName(p: { firstName: string; lastName: string }): string {
  return `${p.firstName} ${p.lastName}`.trim();
}

// sur le site public on n'affiche que le prénom et l'initiale
export function publicName(p: { firstName: string; lastName: string }): string {
  const initial = p.lastName.trim().charAt(0).toLocaleUpperCase("fr-FR");
  return initial ? `${p.firstName} ${initial}.` : p.firstName;
}

// La regex vient de la base : si elle est cassée on laisse passer plutôt que de planter.
export function matchesPattern(value: string, pattern: string | null | undefined): boolean {
  if (!pattern) return true;
  try {
    return new RegExp(`^(?:${pattern})$`).test(value);
  } catch {
    return true;
  }
}

export function isValidRegex(pattern: string): boolean {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}
