// 安装/验收辅助脚本：对桌面端 GUI 端口的 dsh-market 接口发请求（只走 127.0.0.1 回环）。
// 用法：
//   node toggle-dsh-context-tone.mjs on     -> 热挂载（前提：包已在 profile dependencies + bundles）
//   node toggle-dsh-context-tone.mjs off    -> 热卸载
//   node toggle-dsh-context-tone.mjs status -> 查看当前激活状态
// 端口每次启动会变：执行时以当前 GUI URL 为准，用 --port 覆盖（默认 2058）。
import http from 'node:http'

const arg = process.argv[2] || 'status'
const portIndex = process.argv.indexOf('--port')
const PORT = portIndex > -1 ? Number.parseInt(process.argv[portIndex + 1], 10) : 2058
const NAME = 'dsh-context-tone'

if (!Number.isInteger(PORT) || PORT <= 0) {
  console.error('无效端口；用 --port <当前 GUI 端口>')
  process.exit(1)
}

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const req = http.request(
      {
        host: '127.0.0.1',
        port: PORT,
        path,
        method,
        headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {},
      },
      (res) => {
        let text = ''
        res.on('data', (chunk) => { text += chunk })
        res.on('end', () => resolve({ status: res.statusCode, body: text }))
      },
    )
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

const sub = arg === 'on' || arg === 'off' ? 'toggle' : 'status'
const body = arg === 'on'
  ? { name: NAME, enabled: true }
  : arg === 'off'
    ? { name: NAME, enabled: false }
    : undefined

try {
  const res = await request(body ? 'POST' : 'GET', `/dsh-market/${sub}`, body)
  console.log(`HTTP ${res.status}`)
  try {
    console.log(JSON.stringify(JSON.parse(res.body), null, 2))
  } catch {
    console.log(res.body.slice(0, 2000))
  }
} catch (error) {
  console.error('请求失败:', error.message)
  process.exit(1)
}
