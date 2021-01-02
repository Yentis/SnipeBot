import { BitFieldResolvable, Client, DMChannel, Message, PermissionString, TextChannel, User } from 'discord.js'

export function initMessage () {
  let canKick = true
  let botCanManageMessages = true

  const message = ({
    author: {
      id: 'some_user_id'
    },
    channel: {
      send: jest.fn(),
      messages: {
        fetch: jest.fn().mockImplementation((messageId: string) => {
          message.author.id = messageId
          return Promise.resolve(message)
        })
      }
    },
    delete: jest.fn().mockImplementation(() => {
      return Promise.resolve()
    }),
    member: {
      hasPermission: jest.fn().mockImplementation((permission: BitFieldResolvable<PermissionString>) => {
        if (permission === 'KICK_MEMBERS') {
          return canKick
        } else return true
      }),
      permissions: {
        remove: jest.fn().mockImplementation((permission: BitFieldResolvable<PermissionString>) => {
          if (permission === 'KICK_MEMBERS') {
            canKick = false
          }
        })
      }
    },
    guild: {
      me: {
        hasPermission: jest.fn().mockImplementation((permission: BitFieldResolvable<PermissionString>) => {
          if (permission === 'MANAGE_MESSAGES') {
            return botCanManageMessages
          } else return true
        }),
        permissions: {
          remove: jest.fn().mockImplementation((permission: BitFieldResolvable<PermissionString>) => {
            if (permission === 'MANAGE_MESSAGES') {
              botCanManageMessages = false
            }
          })
        }
      }
    }
  } as unknown) as Message

  return message
}

export function initChannel (type: 'text' | 'dm') {
  const channel = {
    type,
    messages: {
      fetch: jest.fn().mockImplementation(() => {
        return Promise.resolve(initMessage())
      })
    }
  } as unknown

  if (type === 'text') {
    return channel as TextChannel
  } else if (type === 'dm') {
    return channel as DMChannel
  }
}

export function initUser () {
  return ({
    id: clientId,
    createDM: jest.fn().mockImplementation(() => {
      return Promise.resolve(initChannel('dm'))
    })
  } as unknown) as User
}

export const clientId = 'mocked_client_id'
export const textChannelId = 'mocked_text_channel_id'
export const nonExistantDmChannelId = 'mocked_non_existant_dm_channel_id'

export function initClient () {
  const user = initUser()

  return ({
    user,
    channels: {
      fetch: jest.fn().mockImplementation((channelId: string) => {
        if (channelId === nonExistantDmChannelId) return Promise.reject('Not a valid Channel ID')
        if (channelId === textChannelId) return Promise.resolve(initChannel('text'))

        return Promise.resolve(initChannel('dm'))
      })
    },
    users: {
      fetch: jest.fn().mockImplementation(() => {
        return Promise.resolve(user)
      })
    }
  } as unknown) as Client
}
