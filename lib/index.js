/**
 * dsh-context-tone — host half.
 *
 * The feature lives in the browser (lib/client.js). This module exists so the
 * bundle patch has a valid Loader row and so the row Config — the settings
 * surface on dsh >= 0.2 — is declared. Values persist under the row id
 * `dsh-context-tone`; the browser half reads them through `configForms` and
 * writes them back with `mutate`.
 *
 * Side-effect free: no services, no timers, no I/O.
 */
export const name = 'dsh-context-tone'

/**
 * dsh >= 0.1.7 marks a Config field live-editable without remount. A 0.1.6-era
 * schemastery predates the method, so the guard keeps this module loadable
 * there (values then behave as ordinary config).
 */
function live(schema) {
  return typeof schema.volatile === 'function' ? schema.volatile() : schema
}

/**
 * The schemastery module is resolved lazily: it is not a hard dependency, and
 * a failed static import would kill this Loader row before the browser half is
 * ever scanned. When it is absent the row Config stays absent and the browser
 * engine simply runs on its built-in defaults.
 */
let Schema = null
try {
  Schema = (await import('@deepseek-ai/schemastery')).default
} catch (error) {
  Schema = null
  console.warn(
    '[dsh-context-tone] @deepseek-ai/schemastery is not resolvable here; the row Config surface is absent: '
      + (error && error.message || String(error)),
  )
}

/**
 * Row Config. Defaults equal the approved tone ladder:
 * calm < 12 % (official gray, no emoji), then 12 / 25 / 50 / 75.
 */
export const Config = Schema === null
  ? undefined
  : Schema.object({
    enabled: live(Schema.boolean().default(true)),
    tier1: live(Schema.natural().min(1).max(100).default(12)),
    tier2: live(Schema.natural().min(1).max(100).default(25)),
    tier3: live(Schema.natural().min(1).max(100).default(50)),
    tier4: live(Schema.natural().min(1).max(100).default(75)),
    color1: live(Schema.string().default('#3b82f6')),
    color2: live(Schema.string().default('#f97316')),
    color3: live(Schema.string().default('#ef4444')),
    color4: live(Schema.string().default('#dc2626')),
    emoji1: live(Schema.string().default('🤔')),
    emoji2: live(Schema.string().default('😰')),
    emoji3: live(Schema.string().default('😭')),
    emoji4: live(Schema.string().default('😱')),
  })

export function apply() {}
