export const normalizeMasterDataKey = (value: string | null | undefined): string =>
  (value || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN');

export const uniqueMasterDataOptions = (values: Array<string | null | undefined>): string[] => {
  const unique = new Map<string, string>();
  values.forEach((raw) => {
    const label = raw?.normalize('NFC').trim().replace(/\s+/g, ' ');
    const key = normalizeMasterDataKey(label);
    if (label && key && !unique.has(key)) unique.set(key, label);
  });
  return [...unique.values()].sort((a, b) => a.localeCompare(b, 'vi'));
};

