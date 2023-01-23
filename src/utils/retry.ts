type Fn<Args extends any[], ReturnType> = (...args: Args) => Promise<ReturnType>
export function retry<Args extends any[], ReturnType>(
  callback: Fn<Args, ReturnType>,
  retries = 0
) {
  return function (...args: Args): Promise<ReturnType> {
    return new Promise((resolve, reject) => {
      return (function retry() {
        callback(...args)
          .then(resolve)
          .catch(err => {
            if (retries-- > 0) {
              setTimeout(retry, 0)
            } else {
              reject(err)
            }
          })
      })()
    })
  }
}
