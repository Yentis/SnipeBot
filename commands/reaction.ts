import { DMChannel } from 'discord.js';
import RawEvent from '../interfaces/rawEvent';
import { getBotId, getUser } from '../services/discordService';
import { getOrCreateDMChannel } from './utils';

async function deleteMessageFromChannel(channel: DMChannel, messageId: string) {
  const message = await channel.messages.fetch(messageId);
  if (message.author.bot) await message.delete();
}

export default async function run(event: RawEvent): Promise<void> {
  const reaction = event.d;

  if (reaction.emoji.id) return;
  if (reaction.emoji.name !== '✅' && reaction.emoji.name !== '☑️' && reaction.emoji.name !== '✔️') return;
  if (reaction.user_id === getBotId()) return;

  const user = await getUser(reaction.user_id);
  if (!user) return;

  const channel = await getOrCreateDMChannel(reaction.channel_id, user);
  if (channel === null) return;

  await deleteMessageFromChannel(channel, reaction.message_id);
}
