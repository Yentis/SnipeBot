export default class UserResponse {
  'user_id': string

  username: string

  constructor(userId: string, username: string) {
    this.user_id = userId;
    this.username = username;
  }
}
