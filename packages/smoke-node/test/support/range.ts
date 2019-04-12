
export function range(from: number, to?: number): number[] {
  if(to === undefined) {
    to   = from
    from = 0
  }
  const array: number[] = []
  for(let i = from; i < to; i++) {
    array.push(i)
  }
  return array
}