import { DMChannel } from 'discord.js';
import RawEvent from '../interfaces/rawEvent';
import { getBot } from '../services/discordService';

async function deleteMessageFromChannel(channel: DMChannel, messageId: string) {
  const message = await channel.messages.fetch(messageId);
  if (message.author.bot) await message.delete();
}

export default async function run(event: RawEvent): Promise<void> {
  if (event.d.emoji.id || event.d.emoji.name !== '✅') return;
  const bot = getBot();
  if (event.d.user_id === bot.user?.id) return;

  const user = bot.users.cache.get(event.d.user_id);
  if (!user) return;
  let channel = bot.channels.cache.get(event.d.channel_id);

  if (channel && !(channel instanceof DMChannel)) return;
  if (!channel) channel = await user.createDM();
  if (!(channel instanceof DMChannel)) return;

  await deleteMessageFromChannel(channel, event.d.message_id);
}
