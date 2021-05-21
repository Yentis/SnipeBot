import {
  ApplicationCommandData, CommandInteraction, DMChannel
} from 'discord.js';
import { getLinkedChannels } from '../services/settingsService';
import Command from '../enums/command';
import RawEvent from '../interfaces/rawEvent';
import onReaction from './reaction';
import onEcho from './echo';
import onLinkChannel from './linkchannel';
import onUnlinkChannel from './unlinkchannel';
import onSnipe from './snipe';
import onLinkUser from './linkuser';
import onUnlinkUser from './unlinkuser';
import onScores from './scores';
import onCount from './count';
import onSnipes from './snipes';
import onDelete from './delete';
import onTop from './top';
import onRebuild from './rebuild';
import onRebuildFailed from './rebuildfailed';
import onStop from './stop';
import onProgress from './progress';

export default async function handleCommand(
  command: Command,
  interaction?: CommandInteraction,
  rawEvent?: RawEvent
): Promise<void> {
  if (command === Command.REACTION) {
    if (!rawEvent) return;
    await onReaction(rawEvent);
    return;
  }
  if (interaction === undefined) return;

  // These commands are always available
  if (command === Command.ECHO) {
    await onEcho(interaction);
    return;
  }

  if (command === Command.LINKCHANNEL) {
    await onLinkChannel(interaction);
    return;
  }

  // All commands are available in DMs
  if (
    interaction.channel === null
    || (!(interaction.channel instanceof DMChannel)
    && !getLinkedChannels().includes(interaction.channel?.id))
  ) {
    return;
  }

  switch (command) {
    case Command.UNLINKCHANNEL:
      await onUnlinkChannel(interaction);
      break;
    case Command.SNIPE:
      await onSnipe(interaction);
      break;
    case Command.LINK:
      await onLinkUser(interaction);
      break;
    case Command.UNLINK:
      await onUnlinkUser(interaction);
      break;
    case Command.SCORES:
      await onScores(interaction);
      break;
    case Command.COUNT:
      await onCount(interaction);
      break;
    case Command.SNIPES:
      await onSnipes(interaction);
      break;
    case Command.DELETE:
      await onDelete(interaction);
      break;
    case Command.TOP:
      await onTop(interaction);
      break;
    case Command.STOP:
      await onStop(interaction);
      break;
    case Command.PROGRESS:
      await onProgress(interaction);
      break;
    // Don't wait for these commands to finish, so the typing indicator doesn't linger
    case Command.REBUILD:
      onRebuild(interaction).catch((error) => console.error(error));
      break;
    case Command.REBUILDFAILED:
      onRebuildFailed(interaction).catch((error) => console.error(error));
      break;
    default:
      break;
  }
}

function getUsernameOption() {
  return {
    name: 'username',
    type: 'STRING',
    description: 'The username to retrieve scores for'
  };
}

function getModeOption() {
  return {
    name: 'mode',
    type: 'STRING',
    description: 'The mode to retrieve scores for'
  };
}

export function getCommandData(): Array<ApplicationCommandData> {
  const commands = [];

  commands.push({
    name: Command[Command.ECHO].toLowerCase(),
    description: 'Replies with your input',
    options: [{
      name: 'input',
      type: 'STRING',
      description: 'The input which should be echoed back',
      required: true
    }]
  });

  commands.push({
    name: Command[Command.LINKCHANNEL].toLowerCase(),
    description: 'Link a channel to allow the bot to post in it'
  });

  commands.push({
    name: Command[Command.UNLINKCHANNEL].toLowerCase(),
    description: 'Unlink a channel'
  });

  commands.push({
    name: Command[Command.SNIPE].toLowerCase(),
    description: 'Manually check a map\'s first place score',
    options: [{
      name: 'beatmap',
      type: 'INTEGER',
      description: 'The ID of the beatmap to check (not beatmapset)',
      required: true
    }]
  });

  commands.push({
    name: Command[Command.LINK].toLowerCase(),
    description: 'Link an osu! account to your discord user, this will make the bot PM you when you get sniped',
    options: [{
      name: 'username',
      type: 'STRING',
      description: 'Your osu! username'
    }]
  });

  commands.push({
    name: Command[Command.UNLINK].toLowerCase(),
    description: 'Unlink any linked accounts from your discord user'
  });

  commands.push({
    name: Command[Command.SCORES].toLowerCase(),
    description: 'Get all unclaimed scores or #1 scores of a given user',
    options: [{
      name: 'user',
      type: 'SUB_COMMAND',
      description: 'Get all #1 scores of a given user',
      options: [getUsernameOption(), getModeOption()]
    }, {
      name: 'unclaimed',
      type: 'SUB_COMMAND',
      description: 'Get all unclaimed scores',
      options: [getModeOption()]
    }]
  });

  commands.push({
    name: Command[Command.COUNT].toLowerCase(),
    description: 'Get the amount of unclaimed scores or #1 scores of a given user',
    options: [{
      name: 'user',
      type: 'SUB_COMMAND',
      description: 'Get the amount of #1 scores of a given user',
      options: [getUsernameOption(), getModeOption()]
    }, {
      name: 'unclaimed',
      type: 'SUB_COMMAND',
      description: 'Get the amount of unclaimed scores',
      options: [getModeOption()]
    }]
  });

  commands.push({
    name: Command[Command.SNIPES].toLowerCase(),
    description: 'Get all scores a given user has been sniped on',
    options: [getUsernameOption(), getModeOption()]
  });

  commands.push({
    name: Command[Command.DELETE].toLowerCase(),
    description: 'Delete things!',
    options: [{
      name: 'target',
      type: 'STRING',
      description: 'Thing to delete',
      required: true
    }]
  });

  commands.push({
    name: Command[Command.TOP].toLowerCase(),
    description: 'Get the top users by amount of #1 scores',
    options: [{
      name: 'count',
      type: 'INTEGER',
      description: 'Amount of users to retrieve (up to 100)',
      required: true
    }, getModeOption()]
  });

  commands.push({
    name: Command[Command.REBUILD].toLowerCase(),
    description: 'Rebuild the score database'
  });

  commands.push({
    name: Command[Command.REBUILDFAILED].toLowerCase(),
    description: 'Rebuild all maps that failed in the previous rebuild'
  });

  commands.push({
    name: Command[Command.STOP].toLowerCase(),
    description: 'Stop rebuilding the database'
  });

  commands.push({
    name: Command[Command.PROGRESS].toLowerCase(),
    description: 'If the score database is being rebuilt, this will show the current progress'
  });

  return commands;
}
