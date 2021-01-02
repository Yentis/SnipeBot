import { RawEvent } from '../classes/raw-event'
import { deleteMessageFromChannel } from '../message-operations'
import { getClient } from '../client-operations'
import { DMChannel, NewsChannel, TextChannel, User } from 'discord.js'

const removeEmojis = [
  '✅',
  '☑️',
  '✔️'
]

export const rawHandler = async (rawEvent: RawEvent): Promise<void> => {
  if (rawEvent.t !== 'MESSAGE_REACTION_ADD') return
  if (!removeEmojis.includes(rawEvent.d.emoji.name)) return
  if (rawEvent.d.user_id === getClient()?.user?.id) return

  const channel = await getChannel(rawEvent)
  if (channel instanceof Error) {
    console.error(channel)
    return
  }

  if (channel.type !== 'dm') return
  void deleteMessageFromChannel(channel, rawEvent.d.message_id)
}

async function getChannel (rawEvent: RawEvent): Promise<TextChannel | NewsChannel | DMChannel | Error> {
  let channel: TextChannel | NewsChannel | DMChannel | undefined

  try {
    channel = await getClient()?.channels.fetch(rawEvent.d.channel_id) as TextChannel | NewsChannel | DMChannel
  } catch (error) {
    let user: User | undefined
    try {
      user = await getClient()?.users.fetch(rawEvent.d.user_id)
    } catch (error) {
      return Error(error)
    }

    if (!user) {
      return Error('User was not defined')
    }

    return user.createDM()
  }

  return channel || Error('Channel was not defined')
}
