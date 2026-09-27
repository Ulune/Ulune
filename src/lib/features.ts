/**
 * What this version of Ulune shows.
 *
 * AI readings, written with a visitor's own key, wait for version 1.1
 * (decided 27 Sep 2026): their code stays, but nothing of it shows or runs.
 * The copy that describes Ulune (the privacy notice, the terms, the private
 * space's lines, the README) says nothing about AI while this is off; turning
 * it back on means writing those back, labelling each AI reading as the EU
 * AI Act asks (art. 50), and adding the AI providers to the content security
 * policy again (src/lib/csp.ts does that from this switch).
 */
export const AI_ENABLED = false;
