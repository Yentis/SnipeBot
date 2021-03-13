import { DMChannel, Message } from 'discord.js';
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
import onHelp from './help';
import onTop from './top';
import onRebuild from './rebuild';
import onRebuildFailed from './rebuildfailed';
import onStop from './stop';
import onProgress from './progress';

export default async function handleCommand(
  command: Command,
  message?: Message,
  rawEvent?: RawEvent
): Promise<void> {
  if (command === Command.REACTION) {
    if (!rawEvent) return;
    await onReaction(rawEvent);
    return;
  }
  if (!message) return;

  // These commands are always available
  if (command === Command.ECHO) {
    await onEcho(message);
    return;
  }
  if (command === Command.LINKCHANNEL) {
    await onLinkChannel(message);
    return;
  }

  // All commands are available in DMs
  if (
    !(message.channel instanceof DMChannel)
    && !getLinkedChannels().includes(message.channel.id)
  ) {
    return;
  }

  switch (command) {
    case Command.UNLINKCHANNEL:
      await onUnlinkChannel(message);
      break;
    case Command.SNIPE:
      await onSnipe(message);
      break;
    case Command.LINK:
      await onLinkUser(message);
      break;
    case Command.UNLINK:
      await onUnlinkUser(message);
      break;
    case Command.SCORES:
      await onScores(message);
      break;
    case Command.COUNT:
      await onCount(message);
      break;
    case Command.SNIPES:
      await onSnipes(message);
      break;
    case Command.DELETE:
      await onDelete(message);
      break;
    case Command.HELP:
      await onHelp(message);
      break;
    case Command.TOP:
      await onTop(message);
      break;
    case Command.STOP:
      await onStop(message);
      break;
    case Command.PROGRESS:
      await onProgress(message);
      break;
    // Don't wait for these commands to finish, so the typing indicator doesn't linger
    case Command.REBUILD:
      onRebuild(message).catch((error) => console.error(error));
      break;
    case Command.REBUILDFAILED:
      onRebuildFailed(message).catch((error) => console.error(error));
      break;
    default:
      break;
  }
}
