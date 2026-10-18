/**
 * The newsletter provider interface. Buttondown is the default; to swap in
 * Kit, beehiiv or anything else, add a file next to buttondown.ts that
 * implements this and register it in index.ts. Nothing else changes.
 */
export interface OutgoingEmail {
  /** Email subject line. */
  subject: string;
  /** Markdown body. Providers that want HTML convert it themselves. */
  markdown: string;
  /** Short identifier for logs and idempotency, e.g. "story-001". */
  reference: string;
}

export interface SendResult {
  /** Provider's own id for the sent email, if it gives one. */
  id: string | null;
  /** Human-readable note for the log. */
  note?: string;
}

export interface NewsletterProvider {
  readonly name: string;
  /** True when the provider has what it needs (API key etc.). */
  isConfigured(): boolean;
  send(email: OutgoingEmail): Promise<SendResult>;
}
