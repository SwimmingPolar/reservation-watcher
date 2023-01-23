import { NextFunction, Router } from 'express'
import { CrawlerInternalError } from '../../helper'
import { watch } from './watch'

const router = Router()
router.get('/watch', async (req, res, next: NextFunction) => {
  try {
    watch()
  } catch (error) {
    // any error caught here have something to do with puppeteer or network (proxy)
    next(CrawlerInternalError())
  }
})

export default router
