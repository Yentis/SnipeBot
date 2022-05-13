/* eslint-disable no-unused-vars */

import { CommandOptionChoiceResolvableType } from 'discord.js';

/* eslint-disable no-shadow */
enum Command {
  REACTION,
  ECHO,
  LINKCHANNEL,
  UNLINKCHANNEL,
  SNIPE,
  LINK,
  UNLINK,
  SCORES,
  COUNT,
  SNIPES,
  DELETE,
  TOP,
  REBUILD,
  REBUILDFAILED,
  STOP,
  PROGRESS
}

interface CommandOption {
  name: string,
  type: CommandOptionChoiceResolvableType
}

interface CommandOptionSub {
  name: string,
  type: 'SUB_COMMAND'
}

export const GeneralOptions: {
  unclaimed: CommandOptionSub,
  user: CommandOptionSub,
  mode: CommandOption,
  username: CommandOption
} = {
  unclaimed: {
    name: 'unclaimed',
    type: 'SUB_COMMAND'
  },
  user: {
    name: 'user',
    type: 'SUB_COMMAND'
  },
  mode: {
    name: 'mode',
    type: 'STRING'
  },
  username: {
    name: 'username',
    type: 'STRING'
  }
};

export const EchoOptions: {
  input: CommandOption
} = {
  input: {
    name: 'input',
    type: 'STRING'
  }
};

export const SnipeOptions: {
  beatmap: CommandOption
} = {
  beatmap: {
    name: 'beatmap',
    type: 'INTEGER'
  }
};

export const DeleteOptions: {
  target: CommandOption
} = {
  target: {
    name: 'target',
    type: 'STRING'
  }
};

export const TopOptions: {
  count: CommandOption
} = {
  count: {
    name: 'count',
    type: 'INTEGER'
  }
};

export default Command;
