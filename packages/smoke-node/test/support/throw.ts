export async function shouldThrow(func: Function) {
  let didThrow = false
  try {
    await func()
  } catch {
    didThrow = true
  }
  if(!didThrow) {
    throw Error('expected throw')
  }
}
