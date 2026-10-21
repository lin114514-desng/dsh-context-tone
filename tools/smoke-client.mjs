// dsh-context-tone 客户端引擎与配置页冒烟测试（无浏览器、无第三方依赖）：
// 用最小 DOM/React 桩执行 lib/client.js，验证档位着色、emoji、关闭开关的清理，
// 以及配置页渲染与保存请求（ops + revision）。
import assert from 'node:assert/strict'
import { fileURLToPath, pathToFileURL } from 'node:url'

const CLIENT = fileURLToPath(new URL('../lib/client.js', import.meta.url))

function makeButton(label) {
  const attrs = new Map([['aria-haspopup', 'dialog']])
  const styles = new Map()
  return {
    tagName: 'BUTTON',
    textContent: label,
    isConnected: true,
    style: {
      setProperty(name, value) { styles.set(name, value) },
      removeProperty(name) { styles.delete(name) },
      getPropertyValue(name) { return styles.get(name) },
    },
    attrs,
    styles,
    getAttribute(name) { return attrs.has(name) ? attrs.get(name) : null },
    setAttribute(name, value) { attrs.set(name, String(value)) },
    removeAttribute(name) { attrs.delete(name) },
    hasAttribute(name) { return attrs.has(name) },
    querySelector(selector) {
      if (selector === 'svg') return { querySelector: () => ({}) }
      return null
    },
  }
}

function installDom(button) {
  const created = []
  const dock = { querySelectorAll: (selector) => (selector.includes('aria-haspopup') ? [button] : []) }
  const doc = {
    body: {},
    documentElement: { appendChild() {} },
    head: { appendChild() {} },
    getElementById() { return null },
    createElement(tag) {
      const element = { tag, id: '', textContent: '', parentNode: null, appendChild(child) { child.parentNode = element } }
      created.push(element)
      return element
    },
    querySelectorAll(selector) { return selector === '[data-composer-dock]' ? [dock] : [] },
  }
  globalThis.document = doc
  globalThis.MutationObserver = class {
    constructor(callback) { this.callback = callback }
    observe() {}
    disconnect() {}
  }
  globalThis.window = {
    addEventListener() {},
    removeEventListener() {},
    __ModuleLoader__: { load(definition) { globalThis.__loadedClient = definition } },
  }
  return created
}

function fakeReact() {
  return {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot(),
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useEffect: () => {},
  }
}

function makeCtx(scope) {
  const forms = scope === null ? null : { get: (ns) => (ns === 'dsh-context-tone' ? scope : null) }
  const slots = {
    inject(name, callback) { callback() },
    register(options, component) { globalThis.__registeredSlot = { options, component } },
  }
  return {
    get(name) {
      if (name === 'configForms') return forms
      if (name === 'slots') return slots
      return undefined
    },
    inject() {},
    effect() {},
  }
}

async function boot(caseName, scope, label) {
  globalThis.__registeredSlot = null
  const button = makeButton(label)
  installDom(button)
  await import(pathToFileURL(CLIENT).href + '?case=' + encodeURIComponent(caseName))
  const definition = globalThis.__loadedClient
  assert.equal(definition.id, 'dsh-context-tone')
  const plugin = definition.factory((name) => {
    if (name === 'react') return fakeReact()
    throw new Error('unexpected require: ' + name)
  })
  assert.equal(plugin.name, 'dsh-context-tone')
  assert.deepEqual(plugin.inject, [])
  plugin.apply(makeCtx(scope))
  return button
}

function readyScope(value, writable = true) {
  return {
    getSnapshot() { return { status: 'ready', value, revision: 7, writable } },
    subscribe() { return () => {} },
  }
}

// 极简函数组件渲染器：把 E() 生成的元素树递归展开（本插件的组件全是函数组件）。
function render(node) {
  if (node === null || node === undefined || typeof node === 'string' || typeof node === 'number') return node
  if (Array.isArray(node)) return node.map(render)
  if (typeof node.type === 'function') return render(node.type(node.props))
  return { type: node.type, props: node.props, children: (node.children || []).map(render) }
}

function walk(node, visit) {
  if (node === null || node === undefined) return
  if (Array.isArray(node)) { for (const item of node) walk(item, visit); return }
  if (typeof node !== 'object') return
  visit(node)
  for (const child of node.children || []) walk(child, visit)
}

// A. 无 configForms：内置默认档位。37% => 注意与偏高之间 => tier2 橙 #f97316 😰
const a = await boot('a', null, '37%')
assert.equal(a.getAttribute('data-dsh-ctx-tone'), '2')
assert.equal(a.getAttribute('data-dsh-ctx-emoji'), '😰')
assert.equal(a.style.getPropertyValue('--dsh-ctx-tone-color'), '#f97316')
console.log('A ok: defaults -> tier2 orange')

// B. 低于第一档：保持官方原色，无属性、无 emoji
const b = await boot('b', null, '8%')
assert.equal(b.getAttribute('data-dsh-ctx-tone'), null)
assert.equal(b.getAttribute('data-dsh-ctx-emoji'), null)
assert.equal(b.style.getPropertyValue('--dsh-ctx-tone-color'), undefined)
console.log('B ok: calm keeps official gray')

// C. 自定义分界值与颜色：37% 在 30–39 档 => tier3，emoji 留空 => 不写 emoji 属性
const c = await boot('c', readyScope({
  enabled: true,
  tier1: 10, tier2: 20, tier3: 30, tier4: 40,
  color1: '#111111', color2: '#222222', color3: '#333333', color4: '#444444',
  emoji1: 'A', emoji2: 'B', emoji3: '', emoji4: 'D',
}), '37%')
assert.equal(c.getAttribute('data-dsh-ctx-tone'), '3')
assert.equal(c.getAttribute('data-dsh-ctx-emoji'), null)
assert.equal(c.style.getPropertyValue('--dsh-ctx-tone-color'), '#333333')
console.log('C ok: custom tiers/colors, empty emoji suppressed')

// D. 总开关关闭：不写任何属性
const d = await boot('d', readyScope({
  enabled: false,
  tier1: 12, tier2: 25, tier3: 50, tier4: 75,
  color1: '#eab308', color2: '#f97316', color3: '#ef4444', color4: '#dc2626',
  emoji1: '🤔', emoji2: '😰', emoji3: '😭', emoji4: '😱',
}), '64%')
assert.equal(d.getAttribute('data-dsh-ctx-tone'), null)
assert.equal(d.getAttribute('data-dsh-ctx-emoji'), null)
assert.equal(d.style.getPropertyValue('--dsh-ctx-tone-color'), undefined)
console.log('D ok: disabled leaves the meter untouched')

// E. 分界值乱序：整组分界回退默认（37% => tier2），颜色仍按字段取值
const e = await boot('e', readyScope({
  enabled: true,
  tier1: 50, tier2: 12, tier3: 25, tier4: 75,
  color1: '#111111', color2: '#222222', color3: '#333333', color4: '#444444',
  emoji1: 'A', emoji2: 'B', emoji3: 'C', emoji4: 'D',
}), '37%')
assert.equal(e.getAttribute('data-dsh-ctx-tone'), '2')
assert.equal(e.getAttribute('data-dsh-ctx-emoji'), 'B')
assert.equal(e.style.getPropertyValue('--dsh-ctx-tone-color'), '#222222')
console.log('E ok: non-increasing tiers fall back to defaults (colors stay per-field)')

// F. 配置页：注册 key 正确、summary 文案、page 渲染、保存请求的 ops 与 revision
await boot('f', null, '37%')
const slot = globalThis.__registeredSlot
assert.ok(slot, 'row config slot registered')
assert.equal(slot.options.name, 'plugins.row.config')
assert.equal(slot.options.key, 'dsh-context-tone#dsh-context-tone')

const summary = slot.component({ view: 'summary' })
assert.equal(typeof summary, 'string')
assert.ok(summary.includes('emoji'))

let recorded = null
const form = {
  state: {
    status: 'ready',
    revision: 3,
    writable: true,
    value: {
      enabled: true,
      tier1: 12, tier2: 25, tier3: 50, tier4: 75,
      color1: '#eab308', color2: '#f97316', color3: '#ef4444', color4: '#dc2626',
      emoji1: '🤔', emoji2: '😰', emoji3: '😭', emoji4: '😱',
    },
  },
  async mutate(ops, revision) { recorded = { ops, revision }; return true },
}

const tree = render(slot.component({ view: 'page', form }))
assert.ok(tree, 'page rendered')
const buttons = []
walk(tree, (node) => { if (node.type === 'button') buttons.push(node) })
const saveButton = buttons.find((node) => String(node.props.className).includes('dct-button-primary'))
assert.ok(saveButton, 'save button found')
assert.equal(saveButton.props.disabled, true) // 未改动时禁用
// 直接触发保存以验证请求格式（草稿已在首次渲染时从 form.state 初始化）
await saveButton.props.onClick()
assert.ok(recorded, 'mutate called')
assert.equal(recorded.revision, 3)
assert.equal(recorded.ops.length, 13)
assert.deepEqual(recorded.ops[0], { op: 'set', path: ['enabled'], value: true })
assert.deepEqual(recorded.ops[1], { op: 'set', path: ['tier1'], value: 12 })
assert.deepEqual(recorded.ops[12], { op: 'set', path: ['emoji4'], value: '😱' })
console.log('F ok: config page renders, save sends 13 set-ops with the snapshot revision')

console.log('ALL CLIENT CASES PASSED')
