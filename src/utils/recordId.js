export function isSeedRecordId(id) {
  return /^[a-z][a-z0-9_-]*-\d+$/i.test(String(id ?? ''));
}
