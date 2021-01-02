import { Emoji, WSEventType } from 'discord.js'

export class RawEvent {
  t = 'MESSAGE_REACTION_ADD' as WSEventType
  d = new Data()
}

class Data {
  user_id = 'some_user_id'
  channel_id = 'some_dm_channel_id'
  message_id = 'some_message_id'
  emoji = ({
    name: '✅'
  } as unknown) as Emoji
}
