import dotenv from 'dotenv'
import express, { Request, Response } from 'express'
import fetch from 'node-fetch'
import api from './api/watch'
import { errorHandler, initiateBrowser } from './helper'
import { log } from './utils'
dotenv.config({
  path: 'config/dev.env'
})

const PORT = process.env.SERVICE_PORT?.trim() || 3710

async function init() {
  // Get express app
  const app = express()

  // Initiate browser instance
  await initiateBrowser()

  // Health check for the docker
  app.get('/', async (req: Request, res: Response) => {
    return res.status(200).send()
  })

  // Connect routes
  app.use('/', api)

  // Bind error handler
  app.use(errorHandler)

  // Start listening
  app.listen(PORT, () => {
    log.info(`Crawler running on ${PORT}`)
  })
}

// Start the app
;(async () => {
  try {
    await init()
  } catch (error) {
    log.error('Crawler', error + '')
  }

  setInterval(async () => {
    await fetch(`http://localhost:${PORT}/watch`)
  }, 30 * 1000)
})()
