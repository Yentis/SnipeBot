interface RawEvent {
  t: string
  d: {
    emoji: { id: string, name: string },
    'user_id': string,
    'channel_id': string,
    'message_id': string
  }
}

export default RawEvent;
