import { Message } from 'discord.js';
import { send } from '../services/discordService';

const HELP_CONTENT = `List of commands:
                
&linkchannel: Link a channel to allow the bot to post in it. (must have kick rights to use this command)
&unlinkchannel: Unlink a channel.

&snipe: Manually check a map's first place score. Must be followed by a beatmap ID. (not beatmapset ID)

&link: Link an osu! account to your discord user, this will make the bot PM you when you get sniped.
You can react with ✅ to remove a message to signify it has been sniped back.
&unlink: Unlink any linked accounts from your discord user.

&progress: If the score database is being rebuilt, this will show the current progress.

&count: Get the amount of #1 scores of a given user, can specify mode.
&scores: Get all #1 scores of a given user, can specify mode by typing 'mania', 'ctb' or 'taiko' after &snipe. Default is standard.
&snipes: Get all scores a given user has been sniped on, can specify mode.
&top: Example: &top5 Get the top X users by amount of #1 scores, can specify mode.

Good to know: The bot will pick up on <r from PP-Generator bot and !rs from BoatBot and check those for new first place scores.`;

export default async function run(message: Message): Promise<void> {
  await send(message.channel, HELP_CONTENT);
}
