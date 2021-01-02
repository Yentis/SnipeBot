import { config } from 'dotenv'
import { Client } from 'discord.js'
import { messageHandler } from './handlers/message-handler'
import { rawHandler } from './handlers/raw-handler'
import { setClient } from './client-operations'

config()

const client = new Client()

client.on('ready', () => {
  if (!client.user) {
    console.error(`Could not find user\n${client}`)
    return
  }

  setClient(client)
  console.log(`${client.user.tag} has logged in.`)
})

client.on('raw', rawHandler)

client.on('message', messageHandler)

client.login(process.env.BOT_TOKEN).catch(error => {
  console.error(`Failed to log in\n${error}`)
})
