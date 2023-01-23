import chalk from 'chalk'
const { greenBright, yellowBright, cyanBright, redBright } = chalk

/**
 * @method info
 * @method error
 */
export const log = {
  /**
   *
   * log successful message to console
   * @param info Message to show
   */
  info(info: string, emphasis?: string): void {
    process.stdout.write(
      new Date().toISOString() +
        ' ' +
        `[${greenBright('INFO')}] ` +
        cyanBright(info) +
        yellowBright(emphasis || '') +
        '\n'
    )
  },
  /**
   * log critical error to console and exit process
   * @param invoker Prefix to log file
   * @param error Error message
   */
  error(invoker: string, error: string): void {
    process.stderr.write(
      new Date().toISOString() +
        ' ' +
        `[${yellowBright('ERROR')}] ${yellowBright(invoker)}` +
        ': ' +
        redBright(error) +
        '\n'
    )
  }
}
