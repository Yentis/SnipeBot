import { Client } from 'discord.js'

let client: Client | undefined

export function setClient (newClient: Client) {
  client = newClient
}

export function getClient () {
  return client
}
