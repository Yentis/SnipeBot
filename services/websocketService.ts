import WebSocket, { MessageEvent } from 'ws';
import { Service } from '../interfaces/service';
import userLinkingService from './userLinkingService';
import settingsService from './settingsService';
import { getCountryScores, handleCountryScores } from './buildService';

let socket: WebSocket | undefined;
let receivingTimeout: NodeJS.Timeout | undefined;

interface Score {
  id: number;
  'user_id': number;
  pp: number;
  'beatmap_id': number;
}

class WebSocketService extends Service {
  async start(): Promise<void> {
    const websocketAddress = process.env.WEBSOCKET_IP;
    if (!websocketAddress) throw new Error('WEBSOCKET_IP environment variable not defined!');

    socket = new WebSocket('ws://127.0.0.1:7727');
    socket.addEventListener('open', () => {
      const lastProcessedScore = settingsService.getLastProcessedScore();

      if (lastProcessedScore === undefined) {
        socket?.send('connect');
      } else {
        socket?.send(lastProcessedScore);
      }
    });
    socket.addEventListener('message', (event) => {
      this.onMessageReceived(event).catch(console.error);
    });

    await Promise.resolve();
  }

  private onMessageReceived = async (event: MessageEvent): Promise<void> => {
    const data = event.data.toString('utf-8');
    const parsed = JSON.parse(data) as number | string | Score;

    if (typeof parsed === 'string') {
      throw new Error(parsed);
    }

    // WebSocket closed, ignore
    if (typeof parsed === 'number') {
      return;
    }

    clearTimeout(receivingTimeout);
    receivingTimeout = setTimeout(() => {
      clearTimeout(receivingTimeout);
      receivingTimeout = undefined;

      this.onLastMessageReceived(parsed.id).catch(console.error);
    }, 1000);

    const linkedUsers = userLinkingService.getMatchingLinkedUsers(parsed.user_id) ?? [];
    if (linkedUsers.length <= 0) return;

    const scores = await getCountryScores(parsed.beatmap_id.toString());
    if (!scores) return;

    await handleCountryScores(scores);
  }

  private async onLastMessageReceived(scoreId: number): Promise<void> {
    settingsService.setLastProcessedScore(scoreId);
    await settingsService.saveSettings();
  }

  override stop(): void {
    socket?.send('disconnect');
    socket = undefined;
  }
}

const webSocketService = new WebSocketService();
export default webSocketService;
