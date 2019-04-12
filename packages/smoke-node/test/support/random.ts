
export function randomString(length: number = 32) {
  return Array.from({ length }).map(n => Math.floor(Math.random() + 26) + 92).join('')
}