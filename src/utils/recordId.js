/** Local demo records use ids like "students-1", "tasks-2". API records use numeric ids. */
export function isSeedRecordId(id) {
  return /^[a-z][a-z0-9_-]*-\d+$/i.test(String(id ?? ''));
}
