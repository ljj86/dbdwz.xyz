/**
 * Simple shared data store for cross-page data passing.
 * More reliable than eventChannel in H5 mode.
 */
const _store = {}

export function setPageData(key, value) {
  _store[key] = value
}

export function getPageData(key) {
  return _store[key]
}

export function clearPageData(key) {
  delete _store[key]
}
