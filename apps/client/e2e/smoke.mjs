/**
 * Smoke test end-to-end: mở bản build, bước vào chùa và chạy thử từng hoạt động chính.
 * Chạy: pnpm build && pnpm e2e   (cần Chromium của Playwright)
 */
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'e2e', 'output')
mkdirSync(outDir, { recursive: true })
const PORT = 4179
const t0 = Date.now()
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a)

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'pipe' })
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('vite preview không khởi động được')), 30000)
  server.stdout.on('data', (d) => {
    if (String(d).includes(String(PORT))) {
      clearTimeout(timer)
      resolve()
    }
  })
  server.on('exit', (code) => reject(new Error(`vite preview thoát với mã ${code}`)))
})

// Render WebGL bằng phần mềm (SwiftShader) để chạy được trên máy CI không có GPU
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 900, height: 600 } })
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(e.message))

const journal = () => page.evaluate(() => window.__chuaol.store.getState().journal)
const waitJournal = (key, min, timeout = 90000) =>
  page.waitForFunction(([k, n]) => window.__chuaol.store.getState().journal[k] >= n, [key, min], { timeout, polling: 250 })
const teleport = (x, z, yaw = Math.PI) =>
  page.evaluate(
    ([x, z, yaw]) => {
      const p = window.__chuaol.runtime.avatars[0]
      p.x = x
      p.z = z
      p.yaw = yaw
    },
    [x, z, yaw],
  )
const promptIs = (label) => page.waitForFunction((l) => window.__chuaol.store.getState().prompt?.label?.startsWith(l), label, { timeout: 30000, polling: 200 })

let failed = false
const step = async (name, fn) => {
  try {
    await fn()
    log('✓', name)
  } catch (e) {
    failed = true
    log('✗', name, '-', e.message.split('\n')[0])
    await page.screenshot({ path: join(outDir, `fail-${name.replace(/\W+/g, '-')}.png`) }).catch(() => {})
  }
}

try {
  await page.goto(`http://localhost:${PORT}/?debug=1&bots=12&quality=low&time=day`)
  await step('trang tải và vẽ được canvas', async () => {
    await page.waitForSelector('canvas', { timeout: 30000 })
    await page.waitForFunction(() => window.__chuaol?.runtime.avatars.length === 13, null, { timeout: 30000 })
    await page.evaluate(() => (window.__chuaol.runtime.maxDt = 0.7))
  })
  await step('bước vào chùa', async () => {
    await page.click('#enter')
    await page.waitForFunction(() => window.__chuaol.store.getState().started, null, { timeout: 10000 })
  })
  await step('đi bộ bằng phím W', async () => {
    const before = await page.evaluate(() => window.__chuaol.runtime.avatars[0].z)
    await page.keyboard.down('KeyW')
    await page.waitForFunction((z0) => window.__chuaol.runtime.avatars[0].z < z0 - 1, before, { timeout: 30000, polling: 200 })
    await page.keyboard.up('KeyW')
  })
  await step('thắp hương', async () => {
    await teleport(0, 14.6)
    await promptIs('Thắp hương')
    await page.keyboard.press('KeyE')
    await page.waitForSelector('#incense-wish', { timeout: 20000 })
    await page.fill('#incense-wish', 'Cầu cho gia đình bình an')
    await page.click('button[type=submit]')
    await waitJournal('incenseSticks', 3)
  })
  await step('thỉnh chuông', async () => {
    await teleport(8.9, 16.6, Math.PI / 2)
    await promptIs('Thỉnh chuông')
    await page.keyboard.press('KeyE')
    await waitJournal('bellRings', 1)
    await page.keyboard.press('Escape')
  })
  await step('gõ mõ niệm Phật', async () => {
    await teleport(-2.7, -14.5)
    await promptIs('Gõ mõ')
    await page.keyboard.press('KeyE')
    await page.waitForSelector('.mo-btn', { timeout: 20000 })
    for (let i = 0; i < 6; i++) await page.keyboard.press('Space')
    await waitJournal('recitations', 1, 20000)
    await page.keyboard.press('Escape')
  })
  await step('lễ Phật ba lạy', async () => {
    await teleport(0, -14.1)
    await promptIs('Lễ Phật')
    await page.keyboard.press('KeyE')
    await waitJournal('prostrations', 3, 60000)
  })
  await step('ngồi thiền', async () => {
    await teleport(-7.2, 6.5, Math.PI / 2)
    await promptIs('Ngồi thiền')
    await page.keyboard.press('KeyE')
    await page.getByRole('button', { name: 'Bắt đầu' }).click({ timeout: 20000 })
    await page.waitForFunction(() => (window.__chuaol.runtime.activity?.t ?? 0) > 21, null, { timeout: 120000, polling: 500 })
    await page.screenshot({ path: join(outDir, 'thien.png') })
    await page.getByRole('button', { name: 'Kết thúc' }).click()
    await waitJournal('meditationSec', 20, 10000)
  })
  await step('thả đèn hoa đăng', async () => {
    await teleport(-4.6, 40, -Math.PI / 2)
    await promptIs('Thả đèn')
    await page.keyboard.press('KeyE')
    await page.waitForSelector('#lantern-wish', { timeout: 20000 })
    await page.click('button[type=submit]')
    await waitJournal('lanterns', 1)
  })
  await step('mở nhật ký tu tập', async () => {
    await page.getByRole('button', { name: 'Nhật ký tu tập' }).click()
    await page.getByText('Cầu cho gia đình bình an').waitFor({ timeout: 10000 })
    await page.screenshot({ path: join(outDir, 'nhat-ky.png') })
    await page.keyboard.press('Escape')
  })
  log('nhật ký:', JSON.stringify(await journal()))
  log('hiệu năng:', JSON.stringify(await page.evaluate(() => window.__chuaol.runtime.perf)))
  await step('không có lỗi trong console', async () => {
    if (errors.length) throw new Error(errors.slice(0, 5).join(' | '))
  })
} finally {
  await browser.close()
  server.kill()
}

if (failed) {
  console.error('Smoke test thất bại')
  process.exit(1)
}
log('Smoke test đạt')
