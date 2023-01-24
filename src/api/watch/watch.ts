import { TextChannel } from 'discord.js'
import { getDiscordClient, getPage } from '../../helper'

const TargetURL = 'http://www.kguide.kr/mmca001/'

export async function watch() {
  // Get a page
  const page = await getPage()
  const discordClient = await getDiscordClient()
  const timeTable = {} as {
    [key: string]: {
      [key: string]: string
    }[]
  }
  // If true, send message to discord
  let shouldAlert = false

  try {
    // Do not track header
    page.setExtraHTTPHeaders({
      DNT: '1'
    })

    // Go to page
    // The page contains the content INSIDE iframe
    // This requires extra care
    await page.goto(TargetURL)
    await page.waitForSelector('.myiframe')
    const frame = await (await page.$('.myiframe'))?.contentFrame()
    await frame?.waitForSelector('div.pg_list')

    // Get a list of exhibitions
    const exhibitionList = await frame?.$$('div.pg_list > ul > li')

    // Find the exhibition we want
    const indexOfExhibition = exhibitionList?.findIndex(async exhibition => {
      const title =
        (await (
          await exhibition.$('.pg_tit')
        )?.evaluate(node => node.textContent)) || ''

      return /이건희컬렉션 특별전/.test(title)
    }) as number

    await exhibitionList?.[indexOfExhibition]?.click()
    await frame?.waitForSelector('.cal_wrap')

    // Days to check
    const times = {
      January: ['#day_27', '#day_28', '#day_29'],
      February: ['#day_4', '#day_5']
    }

    // Be sure to move calendar to the next month when the month is done
    for await (const [month, days] of Object.entries(times)) {
      // Wait for all links to be appeared
      await Promise.all(days.map(day => frame?.waitForSelector(day)))
      const availableDaysButtons = (
        await frame?.evaluate(
          async days =>
            days
              // Find all available days
              .map(
                day =>
                  (document.querySelector(day) as HTMLButtonElement) ||
                  undefined
              )
              // Iterate each and check if it is available
              .map(dayLink => {
                // If it is not available, it has class holyday
                // If it is available, it does not have class holyday
                // @Issue: if the dayLink is undefined, it will mark it as available
                // this has to do with puppeteer logic (eg. timeout)
                const isAvailable = !dayLink?.classList.contains('holyday')
                if (isAvailable) {
                  // If available, click and see how many seats are available
                  return dayLink?.getAttribute('id') || ''
                }
              }),
          days
        )
      )?.filter(e => e) as string[]

      const availableDays = [] as string[]
      for await (const day of availableDaysButtons) {
        // Click the dat button
        await frame?.click(`#${day}`)
        // Wait for the transition to finish
        await frame?.waitForTimeout(1000)

        // Select all the times available
        const listOfTimes = Array.from(
          (await frame?.$$('#seq_table > li')) || []
        )
        // Iterate each time and check the seats available
        for await (const time of listOfTimes) {
          // Find the number of seats available and convert it to number
          const seatsAvailable = Number(
            await time.evaluate(
              node =>
                node
                  // Get the text content of the remaining seats tag
                  .querySelector('span.state')
                  // Remove all non-digit characters
                  ?.textContent?.replace(/\D/g, '') || 0
            )
          )
          if (seatsAvailable >= 2) {
            // If there are more than 2 seats available, push the time to the list
            availableDays.push(day)
          }
        }
      }

      if (availableDays.length > 0) {
        // Toggle alert
        shouldAlert = true
        // Remove overlapping days and re-format the data
        Array.from(new Set(availableDays)).forEach(day => {
          const content = {
            [day]: '예약가능'
          }
          timeTable[month] = timeTable[month]?.concat(content) || [content]
        })
      }

      // Move to the next month
      if (month === 'January') {
        const calendar = await frame?.$('#acc_date')
        await calendar?.evaluate(() => {
          const button = document.querySelector(
            'button.next'
          ) as HTMLButtonElement
          button.click()
        })

        await page.waitForResponse(response => {
          return response.ok() && response.status() === 200
        })
        await page.waitForTimeout(1000)
      }
    }
  } finally {
    // Close the page when the task is done
    // await page.close()

    // Get channel to send message
    const channel = (await discordClient.channels.fetch(
      process.env.DISCORD_BOT_CHANNEL_ID || ''
    )) as TextChannel
    const discordIds = [process.env.YDH, process.env.SSY] as string[]
    const tags = discordIds.map(id => `<@${id}>`).join(' ')

    if (shouldAlert) {
      channel.send(
        tags +
          '\n' +
          JSON.stringify(timeTable, null, 2)
            .replace(/({|}|\[|\]|"|,)/g, '')
            .split('\n')
            .filter(str => str.replace(/\s/g, '').length > 0)
            .join('\n')
      )
    } else {
      channel.send('예약 가능한 시간이 없습니다.')
    }
  }
}
