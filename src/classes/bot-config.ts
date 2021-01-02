export class BotConfig {
  private prefix: string

  constructor (prefix: string) {
    this.prefix = prefix
  }

  getPrefix () {
    return this.prefix
  }
}
