import { TextChannel } from 'discord.js'
import { ElementHandle } from 'puppeteer'
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
      February: ['#day_3', '#day_4', '#day_5']
    }

    // Be sure to move calendar to the next month when the month is done
    for await (const [month, days] of Object.entries(times)) {
      const buttonsHandlers = (await Promise.all(
        days.map(async day => await frame?.$(`a${day}`))
      )) as ElementHandle[]
      const tuples = days.map((day, index) => [
        day,
        buttonsHandlers[index]
      ]) as [string, ElementHandle][]
      for await (const [day, handler] of tuples) {
        const hasTime = await handler?.evaluate((_, day) => {
          const button = document.querySelector(day) as HTMLButtonElement
          button?.click()

          // Remember the all the list of times available
          // Later, compare the length of the above list and
          // the length of the list of times that are sold out.
          // If they are the same, it means that there is time available.
          const listOfTimes = Array.from(
            document.querySelectorAll('#seq_table > li')
          )
          const listOfSoldOutTimes = listOfTimes.filter(time => {
            const endTime = time?.querySelector(
              'span.state.end'
            ) as HTMLSpanElement

            return endTime?.textContent === '매진'
          })

          return listOfTimes.length !== listOfSoldOutTimes.length
        }, day)

        // If there's time available, push to the timeTable
        let content
        if (hasTime) {
          const userId = process.env.YDH
          content = {
            [day]: `있어용 ------------<@${userId}>`
          }
        } else {
          content = {
            [day]: '없어용'
          }
        }
        timeTable[month] = timeTable[month]?.concat(content) || [content]

        // Wait for ajax request to be done
        await page.waitForResponse(response => {
          return response.ok() && response.status() === 200
        })
        // Wait for 1 second
        await page.waitForTimeout(1000)
      }

      // Move to the next month
      if (month === 'January') {
        const calendar = await frame?.$('#acc_date')
        await calendar?.evaluate(() => {
          const button = document.querySelector(
            'button.next'
          ) as HTMLButtonElement
          console.log(button)
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
    await page.close()

    // Get channel to send message
    const channel = (await discordClient.channels.fetch(
      process.env.DISCORD_BOT_CHANNEL_ID || ''
    )) as TextChannel

    channel.send(
      JSON.stringify(timeTable, null, 2)
        .replace(/({|}|\[|\]|"|,)/g, '')
        .split('\n')
        .filter(str => str.replace(/\s/g, '').length > 0)
        .join('\n')
    )
  }
}
