import {
  CommandInteraction, CommandInteractionOption, DMChannel, GuildMember, Message, User
} from 'discord.js';
import LocalUser from '../classes/localUser';
import { getChannel } from '../services/discordService';
import { getUser } from '../services/osuApiService';
import { getLinkedUsers } from '../services/userLinkingService';
import { replyToInteraction } from './manager';

export const Mode: Record<string, number> = {
  osu: 0,
  taiko: 1,
  ctb: 2,
  mania: 3
};
const OWNER_ID = 68834122860077056;

export async function tryGetUser(user: User): Promise<LocalUser | null> {
  const userId = getLinkedUsers()[user.id];
  if (userId !== undefined) return getUser(userId.toString());

  return getUser(user.username);
}

export function getUsernameFromOptions(options: Array<CommandInteractionOption>): string | null {
  const username = options.find((option) => option.name === 'username')?.value;
  if (typeof username !== 'string') return null;

  return username;
}

export function getModeFromOptions(options: Array<CommandInteractionOption>): number {
  const mode = options.find((option) => option.name === 'mode')?.value;
  if (typeof mode !== 'string') return 0;

  return Mode[mode] || 0;
}

export function getUnclaimedFromOptions(
  options: Array<CommandInteractionOption>
): CommandInteractionOption | undefined {
  return options.find((option) => option.name === 'unclaimed');
}

export function getUserFromOptions(
  options: Array<CommandInteractionOption>
): CommandInteractionOption | undefined {
  return options.find((option) => option.name === 'user');
}

export function tryGetBeatmapFromMessage(message: Message, botId: string | null): string | null {
  if (message.author.id === botId) return null;
  if (message.embeds.length === 0) return null;

  const url = message.embeds[0]?.url;
  if (!url || !url.includes('osu.ppy.sh')) return null;
  if (!url.includes('/b/') && !url.includes('/beatmaps/')) return null;

  const split = url.split('/');
  return split[split.length - 1];
}

export function isMod(member: unknown): boolean {
  if (!(member instanceof GuildMember)) return false;
  return member.permissions.has('KICK_MEMBERS') === true;
}

export function isOwner(id: string): boolean {
  return parseInt(id, 10) === OWNER_ID;
}

export async function replyWithInvalidChannel(interaction: CommandInteraction): Promise<void> {
  await replyToInteraction(interaction, 'Invalid channel', { ephemeral: true });
}

export async function replyWithNoPermission(interaction: CommandInteraction): Promise<void> {
  await replyToInteraction(interaction, 'Sorry, you\'re too young to use this command', { ephemeral: true });
}

export async function getOrCreateDMChannel(
  channelId: string | null,
  user: User
): Promise<DMChannel | null> {
  if (channelId === null) {
    return user.createDM();
  }

  const channel = await getChannel(channelId);
  if (channel === null || !(channel instanceof DMChannel)) return null;

  return channel;
}
