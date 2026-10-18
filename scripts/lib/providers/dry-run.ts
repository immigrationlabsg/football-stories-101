import type { NewsletterProvider, OutgoingEmail, SendResult } from './types';

/** Used when no API key is set or DRY_RUN=1. Logs instead of sending. */
export class DryRunProvider implements NewsletterProvider {
  readonly name = 'dry-run';
  isConfigured() {
    return true;
  }
  async send(email: OutgoingEmail): Promise<SendResult> {
    console.log(`[dry-run] would send "${email.subject}" (${email.markdown.length} chars of Markdown)`);
    return { id: null, note: 'dry run, nothing sent' };
  }
}
