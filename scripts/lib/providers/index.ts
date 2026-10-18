import type { NewsletterProvider } from './types';
import { ButtondownProvider } from './buttondown';
import { DryRunProvider } from './dry-run';

export type { NewsletterProvider, OutgoingEmail, SendResult } from './types';

/**
 * Picks the provider from NEWSLETTER_PROVIDER (default "buttondown").
 * Falls back to a dry run when the chosen provider has no credentials, so a
 * scheduled run on a fresh repository never fails, it just reports.
 */
export function selectProvider(env: NodeJS.ProcessEnv = process.env): { provider: NewsletterProvider; dryRun: boolean } {
  if (env.DRY_RUN === '1' || env.DRY_RUN === 'true') return { provider: new DryRunProvider(), dryRun: true };
  const name = (env.NEWSLETTER_PROVIDER ?? 'buttondown').toLowerCase();
  let provider: NewsletterProvider;
  switch (name) {
    case 'buttondown':
      provider = new ButtondownProvider(env);
      break;
    case 'dry-run':
      provider = new DryRunProvider();
      break;
    default:
      throw new Error(`Unknown NEWSLETTER_PROVIDER "${name}". Known: buttondown, dry-run.`);
  }
  if (!provider.isConfigured()) {
    console.warn(`[publish] ${provider.name} is not configured (missing API key); running as a dry run.`);
    return { provider: new DryRunProvider(), dryRun: true };
  }
  return { provider, dryRun: false };
}
