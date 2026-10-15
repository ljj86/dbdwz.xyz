export function passwordByteLength(value) {
  let bytes = 0
  for (const character of String(value || '')) {
    const code = character.codePointAt(0)
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4
  }
  return bytes
}
