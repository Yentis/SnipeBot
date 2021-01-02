import * as MessageOperations from '../message-operations'
import * as ClientOperations from '../client-operations'
import { RawEvent } from '../classes/raw-event'
import { rawHandler } from '../handlers/raw-handler'
import { initClient, nonExistantDmChannelId, textChannelId } from '../constants/test-constants'

describe('Reaction', () => {
  const client = initClient()
  const deleteMessageFromChannel = jest.spyOn(MessageOperations, 'deleteMessageFromChannel')
  let rawEvent: RawEvent

  jest.spyOn(ClientOperations, 'getClient').mockImplementation(() => client)

  beforeEach(() => {
    rawEvent = new RawEvent()
  })

  afterEach(() => {
    deleteMessageFromChannel.mockReset()
  })

  it('should listen to reaction add', () => {
    rawEvent.t = 'MESSAGE_REACTION_ADD'

    rawHandler(rawEvent).then(() => {
      expect(deleteMessageFromChannel).toHaveBeenCalled()
    }).catch((error) => {
      fail(error)
    })
  })

  it('should not listen to other events', () => {
    rawEvent.t = 'MESSAGE_REACTION_REMOVE'

    rawHandler(rawEvent).then(() => {
      expect(deleteMessageFromChannel).not.toHaveBeenCalled()
    }).catch((error) => {
      fail(error)
    })
  })

  it('should listen to checkmark reactions', () => {
    const promises = []

    rawEvent.d.emoji.name = '✅'
    promises.push(rawHandler(rawEvent))
    
    rawEvent.d.emoji.name = '☑️'
    promises.push(rawHandler(rawEvent))

    rawEvent.d.emoji.name = '✔️'
    promises.push(rawHandler(rawEvent))

    Promise.all(promises).then(() => {
      expect(deleteMessageFromChannel).toHaveBeenCalledTimes(3)
    }).catch((error) => {
      fail(error)
    })
  })

  it('should not listen to other reactions', () => {
    rawEvent.d.emoji.name = '👍'

    rawHandler(rawEvent).then(() => {
      expect(deleteMessageFromChannel).not.toHaveBeenCalled()
    }).catch((error) => {
      fail(error)
    })
  })

  it('user id should not be the client', () => {
    if (client.user) {
      rawEvent.d.user_id = client.user.id
    } else {
      fail('Client user was not defined')
    }

    rawHandler(rawEvent).then(() => {
      expect(deleteMessageFromChannel).not.toHaveBeenCalled()
    }).catch((error) => {
      fail(error)
    })
  })

  it('channel should be of type dm', () => {
    rawEvent.d.channel_id = textChannelId

    rawHandler(rawEvent).then(() => {
      expect(deleteMessageFromChannel).not.toHaveBeenCalled()
    }).catch((error) => {
      fail(error)
    })
  })

  it('should create a dm channel if none exists', () => {
    rawEvent.d.channel_id = nonExistantDmChannelId

    rawHandler(rawEvent).then(() => {
      expect(client.users.fetch).toHaveBeenCalled()
      if (client.user) {
        expect(client.user.createDM).toHaveBeenCalled()
      } else {
        fail('User is not defined')
      }
    }).catch((error) => {
      fail(error)
    })
  })
})
