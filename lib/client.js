/**
 * dsh-context-tone — client half (plain JavaScript, no build step).
 *
 * 1. Tone engine: locates the official context meter button inside the
 *    composer dock (`[data-composer-dock] button[aria-haspopup="dialog"]` with
 *    an svg ring and a `NN%` label) and paints its ring + percentage by
 *    occupancy tier. The tier emoji is appended right of the number through a
 *    CSS `::after` hook, so React never owns plugin text nodes.
 * 2. Config page: registers `plugins.row.config` for this bundle's row
 *    (`<package>#<row id>`), rendered inside the Plugins panel row page in
 *    place of the generic row form.
 *
 * Only `react` is required (a client baseline seed module). No official module
 * name appears in the package's `dsh.client.inject`, so the boot graph carries
 * no third-party module edge that could fail to resolve.
 */
window.__ModuleLoader__.load({
  id: 'dsh-context-tone',
  factory: (require) => {
    const React = require('react')
    const E = React.createElement

    const NS = 'dsh-context-tone'
    const STYLE_ID = 'dsh-context-tone-style'
    const TONE_ATTR = 'data-dsh-ctx-tone'
    const EMOJI_ATTR = 'data-dsh-ctx-emoji'
    const COLOR_VAR = '--dsh-ctx-tone-color'
    const HEX_COLOR = /^#[0-9a-f]{6}$/i

    /**
     * Built-in defaults, mirroring the host Config in lib/index.js. The engine
     * keeps working on these while configForms has no ready snapshot yet (or
     * is missing entirely).
     */
    const DEFAULTS = {
      enabled: true,
      tiers: [12, 25, 50, 75],
      colors: ['#3b82f6', '#f97316', '#ef4444', '#dc2626'],
      emojis: ['🤔', '😰', '😭', '😱'],
    }
    const TIER_LABELS = ['注意', '偏高', '危急', '危急+']

    /** Ring + percentage recoloring. `:last-of-type` is the fill circle. */
    const ENGINE_CSS = `
[data-dsh-ctx-tone] svg circle:last-of-type{stroke:var(--dsh-ctx-tone-color) !important}
[data-dsh-ctx-tone] > span{color:var(--dsh-ctx-tone-color) !important}
[data-dsh-ctx-tone][data-dsh-ctx-emoji]::after{content:attr(data-dsh-ctx-emoji);font-size:12px;line-height:1}
`

    /** Config page styling. Colors ride the DSH theme variables with fallbacks. */
    const PAGE_CSS = `
.dct-root{display:flex;flex-direction:column;gap:14px;max-width:760px;font-size:13px;line-height:1.6;color:var(--dsw-alias-label-secondary,#5f6368)}
.dct-header{display:flex;flex-direction:column;gap:2px}
.dct-title{margin:0;font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary,#1f2328)}
.dct-note{margin:0;color:var(--dsw-alias-label-tertiary,#8a8f98)}
.dct-section{display:flex;flex-direction:column;gap:10px;padding:12px 14px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.22));border-radius:10px;background:var(--dsw-specific-menu,transparent)}
.dct-section-title{margin:0;font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary,#1f2328)}
.dct-toggle{display:flex;align-items:center;gap:8px;cursor:pointer;color:var(--dsw-alias-label-primary,#1f2328)}
.dct-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.dct-field{display:flex;flex-direction:column;gap:4px}
.dct-field-label{font-weight:500;color:var(--dsw-alias-label-primary,#1f2328)}
.dct-input{box-sizing:border-box;width:100%;height:28px;padding:2px 8px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.35));border-radius:6px;background:var(--dsw-alias-bg-base,transparent);color:var(--dsw-alias-label-primary,#1f2328);font:inherit}
.dct-input:focus{outline:2px solid var(--dsw-alias-border-focus,rgba(77,107,254,.55));outline-offset:-1px}
.dct-input.dct-invalid{border-color:#ef4444}
.dct-inline{display:flex;align-items:center;gap:6px}
.dct-color{width:34px;height:28px;padding:0;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.35));border-radius:6px;background:transparent;cursor:pointer}
.dct-input-hex{width:92px;font-variant-numeric:tabular-nums;text-transform:lowercase}
.dct-input-emoji{width:76px;font-size:16px;text-align:center}
.dct-tier-row{display:grid;grid-template-columns:56px minmax(0,1fr);gap:10px;align-items:center;padding:10px 0;border-top:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.14))}
.dct-tier-row:first-of-type{border-top:0}
.dct-tier-name{font-weight:600;color:var(--dsw-alias-label-primary,#1f2328)}
.dct-tier-controls{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.dct-swatch{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border:2px solid var(--dct-swatch-color,#999);border-radius:50%;font-size:12px;line-height:1}
.dct-hint{font-size:12px;color:var(--dsw-alias-label-tertiary,#8a8f98)}
.dct-error{font-size:12px;color:#ef4444}
.dct-footer{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.dct-button{height:28px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.35));border-radius:6px;background:var(--dsw-specific-menu,transparent);color:var(--dsw-alias-label-primary,#1f2328);font:inherit;cursor:pointer}
.dct-button:disabled{opacity:.5;cursor:default}
.dct-button-primary{border-color:transparent;background:var(--dsw-alias-brand-primary,#4d6bfe);color:#fff}
.dct-button-text{border-color:transparent;background:transparent;color:var(--dsw-alias-label-secondary,#5f6368)}
.dct-message{font-size:12px}
.dct-message-info{color:var(--dsw-alias-label-tertiary,#8a8f98)}
.dct-message-success{color:#16a34a}
.dct-message-error{color:#ef4444}
.dct-preview{display:flex;flex-direction:column;gap:4px}
.dct-preview-row{display:flex;align-items:center;gap:8px}
.dct-range{min-width:92px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary,#8a8f98)}
.dct-preview-label{min-width:52px;font-weight:500;color:var(--dsw-alias-label-primary,#1f2328)}
`

    /* ============================ value helpers ============================ */

    /** Config values are plain in most snapshots; volatile fields arrive as refs. */
    function unwrap(value) {
      return value && typeof value.get === 'function' ? value.get() : value
    }

    function pickText(value, fallback) {
      const text = unwrap(value)
      return typeof text === 'string' ? text : fallback
    }

    function pickNumber(value, fallback) {
      const parsed = Number(unwrap(value))
      return Number.isFinite(parsed) ? parsed : fallback
    }

    function pickBoolean(value, fallback) {
      const flag = unwrap(value)
      return typeof flag === 'boolean' ? flag : fallback
    }

    function draftFrom(config) {
      const source = config && typeof config === 'object' ? config : DEFAULTS
      const tiers = Array.isArray(source.tiers) ? source.tiers : DEFAULTS.tiers
      const colors = Array.isArray(source.colors) ? source.colors : DEFAULTS.colors
      const emojis = Array.isArray(source.emojis) ? source.emojis : DEFAULTS.emojis
      return {
        enabled: source.enabled !== false,
        tiers: [0, 1, 2, 3].map((index) => String(tiers[index] === undefined ? DEFAULTS.tiers[index] : tiers[index])),
        colors: [0, 1, 2, 3].map((index) => String(colors[index] === undefined ? DEFAULTS.colors[index] : colors[index])),
        emojis: [0, 1, 2, 3].map((index) => String(emojis[index] === undefined ? DEFAULTS.emojis[index] : emojis[index])),
      }
    }

    /** Normalize a raw Config snapshot into the shape the engine consumes. */
    function normalizeConfig(raw) {
      const source = raw && typeof raw === 'object' ? raw : {}
      const tiers = [1, 2, 3, 4].map((slot, index) => {
        const parsed = Math.round(pickNumber(source['tier' + slot], DEFAULTS.tiers[index]))
        return Number.isFinite(parsed) ? parsed : DEFAULTS.tiers[index]
      })
      let usable = true
      for (let index = 0; index < tiers.length; index += 1) {
        if (tiers[index] < 1 || tiers[index] > 100) usable = false
        if (index > 0 && tiers[index] <= tiers[index - 1]) usable = false
      }
      const colors = [1, 2, 3, 4].map((slot, index) => {
        const candidate = pickText(source['color' + slot], DEFAULTS.colors[index]).trim()
        return HEX_COLOR.test(candidate) ? candidate.toLowerCase() : DEFAULTS.colors[index]
      })
      const emojis = [1, 2, 3, 4].map((slot, index) => pickText(source['emoji' + slot], DEFAULTS.emojis[index]))
      return {
        enabled: pickBoolean(source.enabled, DEFAULTS.enabled),
        tiers: usable ? tiers : DEFAULTS.tiers.slice(),
        colors,
        emojis,
      }
    }

    /* ============================== the engine ============================= */

    function ensureStyle() {
      let element = document.getElementById(STYLE_ID)
      if (element) return element
      element = document.createElement('style')
      element.id = STYLE_ID
      element.textContent = ENGINE_CSS
      const parent = document.head || document.documentElement
      if (parent) parent.appendChild(element)
      return element
    }

    function createEngine() {
      let config = normalizeConfig(null)
      let started = false
      let observer = null
      let timer = 0
      const tagged = new Set()

      function clearButton(button) {
        tagged.delete(button)
        if (!button || !button.style) return
        try {
          button.removeAttribute(TONE_ATTR)
          button.removeAttribute(EMOJI_ATTR)
          button.style.removeProperty(COLOR_VAR)
        } catch (error) { /* detached nodes are fine to skip */ }
      }

      function clearAll() {
        for (const button of Array.from(tagged)) clearButton(button)
      }

      function percentageOf(button) {
        const text = typeof button.textContent === 'string' ? button.textContent : ''
        const match = /(\d{1,3})\s*%/.exec(text)
        if (!match) return null
        const percent = Number(match[1])
        if (!Number.isFinite(percent)) return null
        return Math.max(0, Math.min(100, percent))
      }

      function isMeter(button) {
        if (!button || button.tagName !== 'BUTTON') return false
        if (button.getAttribute('aria-haspopup') !== 'dialog') return false
        const svg = button.querySelector('svg')
        if (!svg || !svg.querySelector('circle')) return false
        return percentageOf(button) !== null
      }

      function tierOf(percent) {
        for (let index = config.tiers.length - 1; index >= 0; index -= 1) {
          if (percent >= config.tiers[index]) return index + 1
        }
        return 0
      }

      function paint(button, percent) {
        if (!config.enabled) {
          clearButton(button)
          return
        }
        const tier = tierOf(percent)
        if (tier === 0) {
          clearButton(button)
          return
        }
        const index = tier - 1
        try {
          button.setAttribute(TONE_ATTR, String(tier))
          button.style.setProperty(COLOR_VAR, config.colors[index])
          const emoji = config.emojis[index]
          if (emoji) button.setAttribute(EMOJI_ATTR, emoji)
          else button.removeAttribute(EMOJI_ATTR)
          tagged.add(button)
        } catch (error) { /* keep scanning; a transient failure is harmless */ }
      }

      function scan() {
        if (!started) return
        const found = new Set()
        let docks = []
        try {
          docks = Array.from(document.querySelectorAll('[data-composer-dock]'))
        } catch (error) {
          docks = []
        }
        for (const dock of docks) {
          let buttons = []
          try {
            buttons = Array.from(dock.querySelectorAll('button[aria-haspopup="dialog"]'))
          } catch (error) {
            buttons = []
          }
          for (const button of buttons) {
            if (!isMeter(button)) continue
            const percent = percentageOf(button)
            if (percent === null) continue
            found.add(button)
            paint(button, percent)
          }
        }
        for (const button of Array.from(tagged)) {
          if (!found.has(button) || !button.isConnected) clearButton(button)
        }
      }

      function schedule() {
        if (!started || timer) return
        timer = setTimeout(() => {
          timer = 0
          try {
            scan()
          } catch (error) {
            console.warn('[dsh-context-tone] scan failed', error)
          }
        }, 120)
      }

      function start() {
        if (started) return
        started = true
        try {
          ensureStyle()
        } catch (error) {
          console.warn('[dsh-context-tone] style install failed', error)
        }
        try {
          const target = document.body || document.documentElement
          if (target) {
            observer = new MutationObserver(() => schedule())
            observer.observe(target, { childList: true, subtree: true, characterData: true })
          }
        } catch (error) {
          console.warn('[dsh-context-tone] body observer unavailable', error)
        }
        try {
          window.addEventListener('resize', schedule)
        } catch (error) { /* non-window hosts: resize is a nicety only */ }
        scan()
      }

      function stop() {
        if (!started) return
        started = false
        if (timer) {
          clearTimeout(timer)
          timer = 0
        }
        try {
          if (observer) observer.disconnect()
        } catch (error) { /* already gone */ }
        observer = null
        try {
          window.removeEventListener('resize', schedule)
        } catch (error) { /* non-window hosts */ }
        clearAll()
        try {
          const element = document.getElementById(STYLE_ID)
          if (element && element.parentNode) element.parentNode.removeChild(element)
        } catch (error) { /* already gone */ }
      }

      function setConfig(next) {
        config = next
        scan()
      }

      return { start, stop, setConfig }
    }

    /* ======================= configForms wiring ========================== */

    /** Tiny observable the page uses to pick up the config scope once it lands. */
    function createScopeRef() {
      const listeners = new Set()
      let current = null
      return {
        get() {
          return current
        },
        set(scope) {
          if (scope === current) return
          current = scope
          for (const listener of Array.from(listeners)) {
            try {
              listener()
            } catch (error) { /* listeners are render subscriptions */ }
          }
        },
        subscribe(listener) {
          listeners.add(listener)
          return () => {
            listeners.delete(listener)
          }
        },
      }
    }

    /**
     * Resolve `configForms` for this bundle's row id, softly: a synchronous
     * probe first, then a child injection fiber that waits for the service.
     */
    function attachConfigForms(ctx, scopeRef, onScope) {
      let adopted = false
      function adopt(forms) {
        if (adopted) return
        let scope = null
        try {
          scope = forms && typeof forms.get === 'function' ? forms.get(NS) : null
        } catch (error) {
          console.warn('[dsh-context-tone] configForms.get failed', error)
        }
        if (!scope) return
        adopted = true
        scopeRef.set(scope)
        if (typeof onScope === 'function') onScope(scope)
      }
      try {
        if (typeof ctx.get === 'function') adopt(ctx.get('configForms'))
      } catch (error) { /* service not registered yet: the injection below waits */ }
      if (adopted || typeof ctx.inject !== 'function') return
      try {
        ctx.inject(['configForms'], (fctx) => {
          try {
            adopt(fctx.configForms)
          } catch (error) {
            console.warn('[dsh-context-tone] configForms acquisition failed', error)
          }
        })
      } catch (error) {
        console.warn('[dsh-context-tone] configForms injection failed', error)
      }
    }

    /** Register the row page, preferring an already-known slots service. */
    function attachSlots(ctx, Page) {
      let registered = false
      function register(slots) {
        if (registered) return
        if (!slots || typeof slots.inject !== 'function' || typeof slots.register !== 'function') return
        registered = true
        try {
          slots.inject('plugins.row.config', () => slots.register({
            name: 'plugins.row.config',
            key: NS + '#' + NS,
          }, Page))
        } catch (error) {
          console.warn('[dsh-context-tone] row config registration failed', error)
        }
      }
      try {
        if (typeof ctx.get === 'function') register(ctx.get('slots'))
      } catch (error) { /* service not registered yet */ }
      if (registered || typeof ctx.inject !== 'function') return
      try {
        ctx.inject(['slots'], (sctx) => {
          try {
            register(sctx.slots)
          } catch (error) {
            console.warn('[dsh-context-tone] slots acquisition failed', error)
          }
        })
      } catch (error) {
        console.warn('[dsh-context-tone] slots injection failed', error)
      }
    }

    /** Register a cleanup callback on the plugin lifetime. */
    function onDispose(ctx, dispose) {
      try {
        if (ctx && typeof ctx.effect === 'function') {
          ctx.effect(() => dispose, 'dsh-context-tone: cleanup')
        }
      } catch (error) {
        console.warn('[dsh-context-tone] cleanup hook failed', error)
      }
    }

    /* ============================ config page ============================= */

    const HEX_INPUT = /^#[0-9a-f]{6}$/i

    function safeHex(value, fallback) {
      const candidate = String(value === undefined || value === null ? '' : value).trim()
      return HEX_INPUT.test(candidate) ? candidate.toLowerCase() : fallback
    }

    function validateDraft(draft) {
      const problems = {}
      const tiers = []
      for (let index = 0; index < 4; index += 1) {
        const raw = String(draft.tiers[index] === undefined ? '' : draft.tiers[index]).trim()
        const value = Number(raw)
        if (raw === '' || !Number.isFinite(value) || value < 1 || value > 100) {
          problems['tier' + (index + 1)] = '分界值需为 1–100 的整数（百分数）'
          tiers.push(null)
        } else {
          tiers.push(Math.round(value))
        }
      }
      for (let index = 1; index < 4; index += 1) {
        if (tiers[index] === null || tiers[index - 1] === null) continue
        if (tiers[index] <= tiers[index - 1]) {
          problems['tier' + (index + 1)] = '必须严格大于上一档'
        }
      }
      for (let index = 0; index < 4; index += 1) {
        const candidate = String(draft.colors[index] === undefined ? '' : draft.colors[index]).trim()
        if (!HEX_INPUT.test(candidate)) problems['color' + (index + 1)] = '颜色需为 #RRGGBB 格式'
      }
      return problems
    }

    function buildOps(draft) {
      const ops = [{ op: 'set', path: ['enabled'], value: draft.enabled === true }]
      for (let index = 0; index < 4; index += 1) {
        ops.push({ op: 'set', path: ['tier' + (index + 1)], value: Math.round(Number(draft.tiers[index])) })
      }
      for (let index = 0; index < 4; index += 1) {
        ops.push({ op: 'set', path: ['color' + (index + 1)], value: String(draft.colors[index]).trim().toLowerCase() })
      }
      for (let index = 0; index < 4; index += 1) {
        ops.push({ op: 'set', path: ['emoji' + (index + 1)], value: String(draft.emojis[index] === undefined ? '' : draft.emojis[index]) })
      }
      return ops
    }

    function previewRows(draft) {
      const tiers = draft.tiers.map((value) => Number(value))
      const rows = []
      const calmEnd = Number.isFinite(tiers[0]) ? tiers[0] - 1 : 11
      rows.push({
        key: 'calm',
        range: '0%–' + Math.max(0, calmEnd) + '%',
        label: '平静',
        color: null,
        emoji: '',
        hint: '官方灰（不改色、无 emoji）',
      })
      for (let index = 0; index < 4; index += 1) {
        if (!Number.isFinite(tiers[index])) continue
        const start = tiers[index]
        const end = index === 3 ? 100 : (Number.isFinite(tiers[index + 1]) ? tiers[index + 1] - 1 : 100)
        rows.push({
          key: 'tier' + (index + 1),
          range: start + '%–' + Math.max(start, end) + '%',
          label: TIER_LABELS[index],
          color: safeHex(draft.colors[index], DEFAULTS.colors[index]),
          emoji: String(draft.emojis[index] === undefined ? '' : draft.emojis[index]),
          hint: '',
        })
      }
      return rows
    }

    function ContextToneConfigForm(props) {
      const form = props && props.form
      const scopeRef = props && props.scopeRef

      const scope = React.useSyncExternalStore(
        React.useCallback((listener) => scopeRef.subscribe(listener), [scopeRef]),
        React.useCallback(() => scopeRef.get(), [scopeRef]),
        React.useCallback(() => scopeRef.get(), [scopeRef]),
      )

      const fallbackState = React.useMemo(() => (
        form && form.state ? form.state : { status: 'unavailable', value: undefined, revision: undefined, writable: false }
      ), [form])

      const observable = React.useMemo(() => {
        if (scope && typeof scope.subscribe === 'function' && typeof scope.getSnapshot === 'function') return scope
        return { subscribe: () => () => {}, getSnapshot: () => fallbackState }
      }, [scope, fallbackState])

      const snapshot = React.useSyncExternalStore(
        React.useCallback((listener) => {
          try {
            return observable.subscribe(listener)
          } catch (error) {
            return () => {}
          }
        }, [observable]),
        React.useCallback(() => {
          try {
            return observable.getSnapshot()
          } catch (error) {
            return fallbackState
          }
        }, [observable, fallbackState]),
        React.useCallback(() => fallbackState, [fallbackState]),
      )

      const status = snapshot && snapshot.status ? snapshot.status : 'unavailable'
      const ready = status === 'ready'
      const writable = !(snapshot && snapshot.writable === false)
      const snapshotValue = snapshot ? snapshot.value : undefined
      const serverConfig = React.useMemo(() => (ready ? normalizeConfig(snapshotValue) : null), [ready, snapshotValue])
      const serverKey = ready ? JSON.stringify(draftFrom(serverConfig)) : ''

      const [draft, setDraft] = React.useState(() => draftFrom(serverConfig || DEFAULTS))
      const [dirty, setDirty] = React.useState(false)
      const [saving, setSaving] = React.useState(false)
      const [message, setMessage] = React.useState(null)

      React.useEffect(() => {
        if (!dirty && ready) setDraft(draftFrom(serverConfig))
      }, [serverKey, dirty, ready])

      const problems = validateDraft(draft)
      const problemKeys = Object.keys(problems)
      const valid = problemKeys.length === 0
      const rows = previewRows(draft)

      function edit(patch) {
        setDraft((current) => ({ ...current, ...patch }))
        setDirty(true)
        setMessage(null)
      }

      function editTier(index, value) {
        const next = draft.tiers.slice()
        next[index] = value
        edit({ tiers: next })
      }

      function editColor(index, value) {
        const next = draft.colors.slice()
        next[index] = value
        edit({ colors: next })
      }

      function editEmoji(index, value) {
        const next = draft.emojis.slice()
        next[index] = value
        edit({ emojis: next })
      }

      async function save() {
        if (saving) return
        if (Object.keys(validateDraft(draft)).length > 0) {
          setMessage({ kind: 'error', text: '请先修正标红的字段。' })
          return
        }
        let target = scope
        if (!target && form && typeof form.mutate === 'function') target = form
        if (!target || typeof target.mutate !== 'function') {
          setMessage({ kind: 'error', text: '该插件当前未加载，暂时无法保存。' })
          return
        }
        let liveSnapshot = null
        try {
          if (scope && typeof scope.getSnapshot === 'function') liveSnapshot = scope.getSnapshot()
        } catch (error) { /* fall back to the snapshot rendered above */ }
        const revision = liveSnapshot && liveSnapshot.revision !== undefined
          ? liveSnapshot.revision
          : (snapshot ? snapshot.revision : undefined)
        setSaving(true)
        setMessage({ kind: 'info', text: '保存中…' })
        try {
          const accepted = await target.mutate(buildOps(draft), revision)
          if (accepted === false) {
            setMessage({ kind: 'error', text: '设置已在别处更新，本次未保存；请刷新页面后重试。' })
            return
          }
          setDirty(false)
          setMessage({ kind: 'success', text: '已保存，新的配色立即生效。' })
        } catch (error) {
          console.warn('[dsh-context-tone] save failed', error)
          setMessage({ kind: 'error', text: '保存失败：' + (error && error.message ? error.message : String(error)) })
        } finally {
          setSaving(false)
        }
      }

      function discard() {
        setDraft(draftFrom(serverConfig || DEFAULTS))
        setDirty(false)
        setMessage(null)
      }

      function resetDefaults() {
        setDraft(draftFrom(DEFAULTS))
        setDirty(true)
        setMessage({ kind: 'info', text: '已填入默认值；点「保存」后生效。' })
      }

      if (!ready) {
        return E('div', { className: 'dct-root' },
          E('style', null, PAGE_CSS),
          E('div', { className: 'dct-header' },
            E('h3', { className: 'dct-title' }, '上下文占用色调'),
            E('p', { className: 'dct-note' }, status === 'loading' ? '正在加载设置…' : '该插件当前未加载，暂时无法配置。')))
      }

      const disabled = !writable || saving

      function tierField(index) {
        const problem = problems['tier' + (index + 1)]
        return E('div', { className: 'dct-field', key: 'tier-field-' + index },
          E('span', { className: 'dct-field-label' }, TIER_LABELS[index] + ' ≥（%）'),
          E('input', {
            type: 'number',
            min: 1,
            max: 100,
            step: 1,
            value: draft.tiers[index],
            className: 'dct-input' + (problem ? ' dct-invalid' : ''),
            disabled,
            onChange: (event) => editTier(index, event.target.value),
          }),
          problem ? E('span', { className: 'dct-error' }, problem) : null)
      }

      function tierRow(index) {
        const colorProblem = problems['color' + (index + 1)]
        return E('div', { className: 'dct-tier-row', key: 'tier-row-' + index },
          E('span', { className: 'dct-tier-name' }, TIER_LABELS[index]),
          E('div', { className: 'dct-tier-controls' },
            E('span', {
              className: 'dct-swatch',
              style: { '--dct-swatch-color': safeHex(draft.colors[index], DEFAULTS.colors[index]) },
              title: '预览',
            }, draft.emojis[index] || ''),
            E('input', {
              type: 'color',
              className: 'dct-color',
              value: safeHex(draft.colors[index], DEFAULTS.colors[index]),
              disabled,
              onChange: (event) => editColor(index, event.target.value),
            }),
            E('input', {
              type: 'text',
              value: draft.colors[index],
              maxLength: 7,
              spellCheck: false,
              className: 'dct-input dct-input-hex' + (colorProblem ? ' dct-invalid' : ''),
              disabled,
              onChange: (event) => editColor(index, event.target.value),
            }),
            E('input', {
              type: 'text',
              value: draft.emojis[index],
              maxLength: 8,
              className: 'dct-input dct-input-emoji',
              placeholder: '可留空',
              title: '百分比右侧显示的 emoji，可留空',
              disabled,
              onChange: (event) => editEmoji(index, event.target.value),
            }),
            colorProblem ? E('span', { className: 'dct-error' }, colorProblem) : null))
      }

      return E('div', { className: 'dct-root' },
        E('style', null, PAGE_CSS),
        E('div', { className: 'dct-header' },
          E('h3', { className: 'dct-title' }, '上下文占用色调'),
          E('p', { className: 'dct-note' }, '官方上下文胶囊按占用档位改色（圆环 + 百分比），并在数字右侧显示 emoji。平静档保持官方灰色。')),

        E('section', { className: 'dct-section' },
          E('h4', { className: 'dct-section-title' }, '总开关'),
          E('label', { className: 'dct-toggle' },
            E('input', {
              type: 'checkbox',
              checked: draft.enabled,
              disabled,
              onChange: (event) => edit({ enabled: event.target.checked }),
            }),
            '启用上下文色调'),
          E('p', { className: 'dct-note' }, '关闭后胶囊恢复官方原色，emoji 消失；配置页仍可打开。')),

        E('section', { className: 'dct-section' },
          E('h4', { className: 'dct-section-title' }, '四个分界值'),
          E('div', { className: 'dct-grid' }, [0, 1, 2, 3].map(tierField)),
          E('p', { className: 'dct-hint' }, '从「注意」到「危急+」必须严格递增，范围 1–100。占用百分比达到某档分界值时进入该档。')),

        E('section', { className: 'dct-section' },
          E('h4', { className: 'dct-section-title' }, '分档颜色与 emoji'),
          E('p', { className: 'dct-hint' }, '颜色作用于圆环填充和百分比文字；emoji 显示在百分比数字右侧。'),
          [0, 1, 2, 3].map(tierRow)),

        E('section', { className: 'dct-section' },
          E('h4', { className: 'dct-section-title' }, '档位预览'),
          valid
            ? E('div', { className: 'dct-preview' }, rows.map((row) => E('div', { className: 'dct-preview-row', key: row.key },
              E('span', { className: 'dct-range' }, row.range),
              E('span', { className: 'dct-preview-label' }, row.label),
              row.color
                ? E('span', { className: 'dct-swatch', style: { '--dct-swatch-color': row.color } }, row.emoji || '')
                : E('span', { className: 'dct-swatch', style: { '--dct-swatch-color': '#9aa0a6' } }, ''),
              E('span', { className: 'dct-hint' }, row.hint || row.color + (row.emoji ? ' ' + row.emoji : '')))))
            : E('p', { className: 'dct-error' }, '分界值或颜色有误，修正后显示预览。')),

        writable ? null : E('p', { className: 'dct-note' }, '当前 profile 的设置为只读，无法保存。'),

        E('div', { className: 'dct-footer' },
          E('button', {
            type: 'button',
            className: 'dct-button dct-button-primary',
            disabled: disabled || !dirty || !valid,
            onClick: save,
          }, saving ? '保存中…' : '保存'),
          E('button', {
            type: 'button',
            className: 'dct-button',
            disabled: disabled || !dirty,
            onClick: discard,
          }, '放弃修改'),
          E('button', {
            type: 'button',
            className: 'dct-button dct-button-text',
            disabled,
            onClick: resetDefaults,
          }, '恢复默认'),
          message ? E('span', { className: 'dct-message dct-message-' + message.kind }, message.text) : null))
    }

    function makeRowConfigPage(scopeRef) {
      function ContextTonePage(props) {
        const view = props && props.view
        if (view === 'summary') {
          return '按上下文占用档位给官方胶囊改色并显示 emoji（分界值、颜色、emoji 可改）。'
        }
        return E(ContextToneConfigForm, { form: props && props.form, scopeRef })
      }
      return ContextTonePage
    }

    /* ============================== plugin ================================ */

    function apply(ctx) {
      const engine = createEngine()
      const scopeRef = createScopeRef()

      attachConfigForms(ctx, scopeRef, (scope) => {
        const read = () => {
          try {
            const snapshot = typeof scope.getSnapshot === 'function' ? scope.getSnapshot() : null
            const value = snapshot && snapshot.status === 'ready' ? snapshot.value : null
            engine.setConfig(normalizeConfig(value))
          } catch (error) {
            console.warn('[dsh-context-tone] config read failed', error)
          }
        }
        read()
        if (typeof scope.subscribe === 'function') {
          try {
            const off = scope.subscribe(read)
            if (typeof off === 'function') {
              onDispose(ctx, () => {
                try {
                  off()
                } catch (error) { /* already disposed */ }
              })
            }
          } catch (error) {
            console.warn('[dsh-context-tone] config subscription failed', error)
          }
        }
      })

      attachSlots(ctx, makeRowConfigPage(scopeRef))

      engine.start()
      onDispose(ctx, () => engine.stop())
    }

    return { name: NS, inject: [], apply }
  },
})
