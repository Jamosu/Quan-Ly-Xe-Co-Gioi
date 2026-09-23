export const normalizeMasterDataKey = (value: string | null | undefined): string =>
  (value || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN');

const displayScore = (value: string): number => {
  const letters = value.replace(/[^\p{L}]/gu, '');
  if (!letters) return 0;
  if (letters === letters.toLocaleLowerCase('vi-VN')) return 1;
  if (letters === letters.toLocaleUpperCase('vi-VN')) return 2;
  return 3;
};

/**
 * Deduplicates only values that are certainly equivalent (Unicode, whitespace,
 * and casing). Catalog labels win; otherwise the most-used, best-cased label wins.
 */
export const canonicalizeMasterDataValues = (
  values: Array<string | null | undefined>,
  catalogLabels: Array<string | null | undefined> = [],
): string[] => {
  const catalogByKey = new Map<string, string>();
  for (const raw of catalogLabels) {
    const label = raw?.normalize('NFC').trim().replace(/\s+/g, ' ');
    const key = normalizeMasterDataKey(label);
    if (label && key && !catalogByKey.has(key)) catalogByKey.set(key, label);
  }

  const groups = new Map<string, Map<string, number>>();
  for (const raw of values) {
    const label = raw?.normalize('NFC').trim().replace(/\s+/g, ' ');
    const key = normalizeMasterDataKey(label);
    if (!label || !key) continue;
    const variants = groups.get(key) || new Map<string, number>();
    variants.set(label, (variants.get(label) || 0) + 1);
    groups.set(key, variants);
  }

  return [...groups.entries()]
    .map(([key, variants]) => {
      const catalogLabel = catalogByKey.get(key);
      if (catalogLabel) return catalogLabel;
      return [...variants.entries()].sort((a, b) =>
        b[1] - a[1] || displayScore(b[0]) - displayScore(a[0]) || a[0].localeCompare(b[0], 'vi'),
      )[0][0];
    })
    .sort((a, b) => a.localeCompare(b, 'vi'));
};

