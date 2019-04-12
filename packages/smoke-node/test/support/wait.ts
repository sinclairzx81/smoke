
type WaitForFunction = () => boolean

/** Periodically checks the function for a true condition then resolves. */
export function wait (func: () => boolean, maxWait: number = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const test = () => {
      if(func()) {
        return resolve()
      } else {
        const delta = Date.now() - start
        if(delta < maxWait) {
          setTimeout(() => test(), 10)
        } else {
          reject(new Error('give up'))
        }
      }
    }
    test()
  })
}