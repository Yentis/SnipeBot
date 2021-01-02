import { Message } from 'discord.js'
import { config } from 'dotenv'

config()

export abstract class BaseCommand {
  protected abstract name: string
  protected abstract requiresAuthorization: boolean

  getName (): string {
    return this.name
  }

  async onCommandReceived (message: Message, content: string): Promise<boolean> {
    if (!this.requiresAuthorization) return true
    return message.member?.hasPermission('KICK_MEMBERS') || message.author.id === process.env.OWNER_ID
  }
}
