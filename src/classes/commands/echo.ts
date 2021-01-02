import { Message } from 'discord.js'
import { CommandEnum } from '../../enums/command-enum'
import { BaseCommand } from './base-command'

export class Echo extends BaseCommand {
  private static instance: Echo

  protected name = CommandEnum.ECHO
  protected requiresAuthorization = true

  private constructor () {
    super()
  }

  static getInstance (): Echo {
    if (!Echo.instance) {
      Echo.instance = new Echo()
    }

    return Echo.instance
  }

  async onCommandReceived (message: Message, content: string): Promise<boolean> {
    if (!await super.onCommandReceived(message, content)) return false

    message.channel.send({
      content,
      disableMentions: 'all'
    })

    if (message.guild?.me?.hasPermission('MANAGE_MESSAGES')) {
      message.delete()
    }

    return true
  }
}
