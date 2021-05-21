import { ReactionEmoji } from 'discord.js';

interface Reaction {
  emoji: ReactionEmoji

  'user_id': string

  'channel_id': string

  'message_id': string
}

export default Reaction;
