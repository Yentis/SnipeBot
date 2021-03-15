import { Message } from 'discord.js';
import Params from '../classes/params';
import { send } from '../services/discordService';
import { getUser } from '../services/osuApiService';

const Mode: Record<string, number> = {
  osu: 0,
  taiko: 1,
  ctb: 2,
  mania: 3
};
const OWNER_ID = 68834122860077056;
const MAP_REGEX = /^https:\/\/osu.ppy.sh\/b\/[0-9]*$/;

export async function getParamsFromMessage(message: Message): Promise<Params> {
  const params = new Params();
  const options = message.content.split(' ');

  if (options.length <= 1) {
    const user = await getUser(message.author.username);
    if (user) params.username = user.username;
    return params;
  }

  const mode = Mode[options[1]];
  if (mode !== undefined) {
    options.splice(1, 1);
    params.mode = mode;
  }

  if (options.length <= 1) {
    const user = await getUser(message.author.username);
    if (user) params.username = user.username;
    return params;
  }

  params.username = options.slice(1, options.length).join(' ');
  return params;
}

export function tryGetBeatmapFromMessage(message: Message, botId: string | null): string | null {
  if (message.author.id === botId) return null;
  if (message.embeds.length === 0) return null;

  const url = message.embeds[0]?.url;
  if (!url) return null;
  if (!MAP_REGEX.exec(url)) return null;

  const split = url.split('/');
  return split[split.length - 1];
}

export function isMod(message: Message): boolean {
  return message.member?.hasPermission('KICK_MEMBERS') === true;
}

export function isOwner(message: Message): boolean {
  return parseInt(message.author.id, 10) === OWNER_ID;
}

export async function sendNoPermissionMessage(message: Message): Promise<void> {
  await send(message.channel, 'Sorry, you\'re too young to use this command.');
}
