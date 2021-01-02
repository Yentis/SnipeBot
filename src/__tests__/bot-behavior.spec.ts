import { Message } from 'discord.js'
import { getClient, setClient } from '../client-operations'
import { botConfig } from '../configs/bot-config'
import { initClient, initMessage } from '../constants/test-constants'
import { messageHandler } from '../handlers/message-handler'

describe('Bot Behavior', () => {
  let message: Message

  beforeEach(() => {
    message = initMessage()
  })

  it('client initializes as undefined', () => {
    expect(getClient()).toBeUndefined()
  })

  it('client can be set when ready', () => {
    const client = initClient()
    setClient(client)
    expect(getClient()).toBe(client)
  })

  it('should not respond to incorrect prefix', () => {
    const incorrectPrefix = botConfig.getPrefix() === '&' ? '!' : '&'
    message.content = `${incorrectPrefix}echo expecting no response`

    messageHandler(message).then(() => {
      expect(message.channel.send).not.toHaveBeenCalled()
    }).catch(error => {
      fail(error)
    })
  })

  it('should not respond to invalid command', () => {
    message.content = `${botConfig.getPrefix()}someunknowncommand expecting no response`

    messageHandler(message).then(() => {
      expect(message.channel.send).not.toHaveBeenCalled()
    }).catch(error => {
      fail(error)
    })
  })
})
