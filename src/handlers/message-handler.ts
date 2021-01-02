import { Message } from 'discord.js'
import { botConfig } from '../configs/bot-config'
import { getCommandFromMessage, getContentFromMessage } from '../message-operations'
import { config } from 'dotenv'

config()

export const messageHandler = async (message: Message) => {
  if (!message.content.startsWith(botConfig.getPrefix())) return
  const command = getCommandFromMessage(message)
  const content = getContentFromMessage(message)

  await command?.onCommandReceived(message, content)
}
