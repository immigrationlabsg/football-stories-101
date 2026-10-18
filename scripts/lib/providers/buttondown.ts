import type { NewsletterProvider, OutgoingEmail, SendResult } from './types';

/**
 * Buttondown adapter. Docs: https://docs.buttondown.com/api-emails-create
 * Creates an email with status "about_to_send", which Buttondown sends to
 * every regular subscriber straight away. Buttondown renders Markdown, so
 * the story file is the email body.
 */
export class ButtondownProvider implements NewsletterProvider {
  readonly name = 'buttondown';
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.apiKey = env.BUTTONDOWN_API_KEY?.trim() || undefined;
    this.baseUrl = (env.BUTTONDOWN_API_URL?.trim() || 'https://api.buttondown.com/v1').replace(/\/+$/, '');
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async send(email: OutgoingEmail): Promise<SendResult> {
    if (!this.apiKey) throw new Error('BUTTONDOWN_API_KEY is not set');
    const res = await fetch(`${this.baseUrl}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'football-stories-101-publisher',
      },
      body: JSON.stringify({
        subject: email.subject,
        body: email.markdown,
        status: 'about_to_send',
        email_type: 'public',
        slug: email.reference,
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Buttondown responded ${res.status}: ${text.slice(0, 500)}`);
    }
    let id: string | null = null;
    try {
      id = (JSON.parse(text) as { id?: string }).id ?? null;
    } catch {
      /* non-JSON body; keep going */
    }
    return { id, note: `Buttondown accepted "${email.subject}"` };
  }
}
