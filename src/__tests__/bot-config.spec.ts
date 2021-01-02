import { BotConfig } from '../classes/bot-config'
import { botConfig } from '../configs/bot-config'

describe('Bot Config', () => {
  it('config should be an instance of BotConfig', () => {
    expect(botConfig).toBeInstanceOf(BotConfig)
  })

  it('prefix should be one character', () => {
    expect(botConfig.getPrefix().length).toBe(1)
  })
})
