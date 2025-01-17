import { NetworkService } from '../NetworkService/NetworkService'
import { SlackMessage } from './SlackMessage'
import { SlackResponse } from './SlackResponse'

type MessageItem = {
  bot_id?: string
  text?: string
}

type OutputMessage = {
  role: 'assistant' | 'user'
  content: string
}

interface ApiResponse {
  messages: MessageItem[]
}

export class SlackClient {
  networkService: NetworkService
  token: string

  constructor(networkService: NetworkService, token: string) {
    this.networkService = networkService
    this.token = token
  }

  async getThreadHistory(channel: string, ts: string): Promise<OutputMessage[]> {
    const url = new URL('https://slack.com/api/conversations.replies')
    url.searchParams.append('channel', channel)
    url.searchParams.append('ts', ts)

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    })

    const { messages } = await response.json() as ApiResponse

    return messages.map(
      ({ bot_id, text }: MessageItem): OutputMessage => ({
        role: bot_id ? 'assistant' : 'user',
        content: text || '',
      }),
    )
  }

  async postMessage(message: SlackMessage): Promise<void> {
    await this.post('https://slack.com/api/chat.postMessage', message)
  }

  async postEphemeralMessage(message: SlackMessage): Promise<void> {
    await this.post('https://slack.com/api/chat.postEphemeral', message)
  }

  async postResponse(responseURL: string, response: SlackResponse): Promise<void> {
    await this.post(responseURL, response)
  }

  async deleteMessage(responseURL: string): Promise<void> {
    await this.post(responseURL, {
      delete_original: true,
    })
  }

  async openView(triggerId: string, view: any): Promise<void> {
    await this.post('https://slack.com/api/views.open', {
      trigger_id: triggerId,
      view: view,
    })
  }

  async updateView(viewId: string, view: any): Promise<void> {
    await this.post('https://slack.com/api/views.update', {
      view_id: viewId,
      view: view,
    })
  }

  private async post(url: string, body: any) {
    const response = await this.networkService.post(url, body, {
      Authorization: 'Bearer ' + this.token,
    })
    this.processResponse(response)
  }

  private async processResponse(response: any) {
    if (!response.ok) {
      const metadata = response.response_metadata
      if (metadata.messages != null && metadata.messages.length > 0) {
        throw new Error(response.error + ': ' + metadata.messages[0])
      } else {
        throw new Error(response.error)
      }
    }
  }
}
