import { DMChannel } from 'discord.js';
import RawEvent from '../interfaces/rawEvent';
import { getBotId, getChannel, getUser } from '../services/discordService';

async function deleteMessageFromChannel(channel: DMChannel, messageId: string) {
  const message = await channel.messages.fetch(messageId);
  if (message.author.bot) await message.delete();
}

export default async function run(event: RawEvent): Promise<void> {
  const reaction = event.d;

  if (reaction.emoji.id || reaction.emoji.name !== '✅') return;
  if (reaction.user_id === getBotId()) return;

  const user = await getUser(reaction.user_id);
  if (!user) return;
  let channel = getChannel(reaction.channel_id);

  if (channel && !(channel instanceof DMChannel)) return;
  if (!channel) channel = await user.createDM();
  if (!(channel instanceof DMChannel)) return;

  await deleteMessageFromChannel(channel, reaction.message_id);
}
