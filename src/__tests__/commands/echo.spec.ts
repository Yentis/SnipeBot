import { Message } from 'discord.js'
import { botConfig } from '../../configs/bot-config'
import { initClient, initMessage } from '../../constants/test-constants'
import { messageHandler } from '../../handlers/message-handler'
import * as ClientOperations from '../../client-operations'

describe('Echo Command', () => {
  let message: Message
  const client = initClient()

  jest.spyOn(ClientOperations, 'getClient').mockImplementation(() => client)

  beforeEach(() => {
    message = initMessage()
  })

  it('should respond with input', () => {
    message.content = `${botConfig.getPrefix()}echo hello there`

    messageHandler(message).then(() => {
      expect(message.channel.send).toHaveBeenCalledWith({
        content: 'hello there',
        disableMentions: 'all'
      })
    }).catch(error => {
      fail(error)
    })
  })

  it('user should have kick rights', () => {
    if (message.member) {
      message.member.permissions.remove('KICK_MEMBERS')
    } else {
      fail('Member was not defined')
    }
    message.content = `${botConfig.getPrefix()}echo hello there`

    messageHandler(message).then(() => {
      expect(message.channel.send).not.toHaveBeenCalled()
    }).catch(error => {
      fail(error)
    })
  })

  it('alternatively, user should be the owner of the bot', () => {
    message.content = `${botConfig.getPrefix()}echo hello there`

    if (message.member) {
      message.member.permissions.remove('KICK_MEMBERS')
    } else {
      fail('Member was not defined')
    }

    if (process.env.OWNER_ID) {
      message.author.id = process.env.OWNER_ID
    } else {
      fail('Owner ID was not defined')
    }

    messageHandler(message).then(() => {
      expect(message.channel.send).toHaveBeenCalledWith({
        content: 'hello there',
        disableMentions: 'all'
      })
    }).catch(error => {
      fail(error)
    })
  })

  it('original message should be removed', () => {
    message.content = `${botConfig.getPrefix()}echo hello there`

    messageHandler(message).then(() => {
      expect(message.delete).toHaveBeenCalled()
    }).catch(error => {
      fail(error)
    })
  })

  it('should check if bot has delete permission', () => {
    if (!message.guild) {
      fail('Guild was not defined')
    }
    if (!message.guild.me) {
      fail('Me was not defined')
    }
    message.guild.me.permissions.remove('MANAGE_MESSAGES')
    message.content = `${botConfig.getPrefix()}echo hello there`

    messageHandler(message).then(() => {
      expect(message.delete).not.toHaveBeenCalled()
    }).catch(error => {
      fail(error)
    })
  })
})
