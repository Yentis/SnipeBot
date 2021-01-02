import { Message } from 'discord.js'
import { botConfig } from '../configs/bot-config'
import { clientId, initClient, initMessage } from '../constants/test-constants'
import * as MessageOperations from '../message-operations'
import * as ClientOperations from '../client-operations'
import { Echo } from '../classes/commands/echo'

describe('Message Operations', () => {
  let message: Message
  const client = initClient()

  jest.spyOn(ClientOperations, 'getClient').mockImplementation(() => client)

  beforeEach(() => {
    message = initMessage()
  })

  it('should be able to get command', () => {
    message.content = ` ${botConfig.getPrefix()}echo and some text `
    const command = MessageOperations.getCommandFromMessage(message)

    expect(command).toBeInstanceOf(Echo)
  })

  it('should be able to get content from message', () => {
    message.content = ` ${botConfig.getPrefix()}somecommand and some text `
    const content = MessageOperations.getContentFromMessage(message)

    expect(content).toBe('and some text')
  })

  it('should be able to remove a message', () => {
    message.author.id = clientId

    MessageOperations.deleteMessageFromChannel(message.channel, message.author.id).then(() => {
      expect(message.delete).toHaveBeenCalled()
    }).catch(error => {
      fail(error)
    })
  })

  it('should not be able to remove the message of another user', () => {
    MessageOperations.deleteMessageFromChannel(message.channel, message.author.id).then(() => {
      expect(message.delete).not.toHaveBeenCalled()
    }).catch(error => {
      fail(error)
    })
  })
})
