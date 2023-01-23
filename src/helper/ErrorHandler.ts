import { NextFunction, Request, Response } from 'express'
import { log } from '../utils'

const crawlerInternalErrorMessage = 'internal error'
export const CrawlerInternalError = () => new Error(crawlerInternalErrorMessage)

export async function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (error && error?.message === crawlerInternalErrorMessage) {
    log.error('Crawler', crawlerInternalErrorMessage)
    res.status(500).json({
      error: crawlerInternalErrorMessage
    })

    next()
  }
}
