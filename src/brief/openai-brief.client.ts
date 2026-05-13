import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenaiBriefClient {
  constructor(private readonly config: ConfigService) {}

  private getKeyAndModel(): { apiKey: string; model: string } {
    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim() ?? '';
    const model = this.config.get<string>('OPENAI_MODEL')?.trim() ?? '';
    if (!apiKey || !model) {
      throw new ServiceUnavailableException(
        'Server is not configured: set OPENAI_API_KEY and OPENAI_MODEL in the backend environment.',
      );
    }
    return { apiKey, model };
  }

  /**
   * Calls Chat Completions with JSON object mode. Returns raw message content (JSON text).
   */
  async completeJson(system: string, user: string): Promise<string> {
    const { apiKey, model } = this.getKeyAndModel();
    const openai = new OpenAI({ apiKey });
    let completion: OpenAI.Chat.ChatCompletion;
    try {
      completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'OpenAI request failed';
      throw new BadGatewayException(`OpenAI error: ${message}`);
    }
    const content = completion.choices[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new BadGatewayException('OpenAI returned an empty response.');
    }
    return content.trim();
  }
}
