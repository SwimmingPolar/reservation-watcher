export const asyncSleep = (delay: number) =>
  new Promise(resolve => {
    setTimeout(resolve, delay)
  })

export const syncSleep = (delay: number) => {
  const now = Date.now()
  while (Date.now() < now + delay) {
    //
  }
}
