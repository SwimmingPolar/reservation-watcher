import Discord, { Client, GatewayIntentBits, TextChannel } from 'discord.js'
import { log } from '../utils/logger'

let client: Client

export const getDiscordClient = async () => {
  try {
    if (client !== undefined) {
      return client
    }

    client = new Discord.Client({
      intents: [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent
      ]
    })
    await client.login(process.env.DISCORD_BOT_TOKEN || '')
  } catch (error) {
    log.error('DiscordHelper', error + '')
  }
  return client
}
