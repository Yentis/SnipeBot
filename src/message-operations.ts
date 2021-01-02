import { DMChannel, Message, NewsChannel, TextChannel } from 'discord.js'
import { getClient } from './client-operations'
import { botConfig } from './configs/bot-config'
import { BaseCommand } from './classes/commands/base-command'
import { Echo } from './classes/commands/echo'
import { CommandEnum } from './enums/command-enum'

export function getCommandFromMessage (message: Message): BaseCommand | undefined {
  let command = message.content.trim()
  command = command.replace(botConfig.getPrefix(), '')
  command = command.substring(0, command.indexOf(' '))

  return getCommandByName(command)
}

export function getContentFromMessage (message: Message) {
  let content = message.content.trim()
  content = content.substring(content.indexOf(' '))

  return content.trim()
}

export async function deleteMessageFromChannel (channel: TextChannel | DMChannel | NewsChannel, messageId: string): Promise<void> {
  const message = await channel.messages.fetch(messageId)
  if (message.author.id !== getClient()?.user?.id) return

  await message.delete()
}

function getCommandByName (name: string): BaseCommand | undefined {
  switch (name) {
    case CommandEnum.ECHO:
      return Echo.getInstance()
    default:
      break;
  }
}
