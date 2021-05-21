import { WSEventType } from 'discord.js';
import Reaction from './reaction';

interface RawEvent {
  t: WSEventType
  d: Reaction
}

export default RawEvent;
