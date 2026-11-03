import { useEffect, useState } from 'react'
import { QUALITY_LABELS, TIME_LABELS, isTouchDevice } from '../config'
import { emote, interact, sacredHere, speak } from '../game/activities'
import { PHRASES } from '../game/actors/avatars'
import { ZONE_NAMES } from '../game/layout'
import { runtime } from '../game/runtime'
import { canChiYear, lunarLabel, solarToLunar, specialDay } from '../lib/lunar'
import { WEEKDAYS, formatClock, vnNow } from '../lib/vnTime'
import { useStore } from '../state/store'
import { IconBook, IconHelp, IconSliders } from './icons'
import { Joystick } from './Joystick'

function useClock(ms = 20000) {
  const [now, setNow] = useState(() => vnNow())
  useEffect(() => {
    const id = setInterval(() => setNow(vnNow()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}

export function DateCard() {
  const now = useClock()
  const timeMode = useStore((s) => s.settings.timeMode)
  const stats = useStore((s) => s.stats)
  const bots = useStore((s) => s.settings.bots)
  const lunar = solarToLunar(now.day, now.month, now.year)
  const special = specialDay(lunar)
  return (
    <div className="date-card panel">
      <div className="solar">
        {WEEKDAYS[now.weekday]}, {now.day}/{now.month}/{now.year}
      </div>
      <div className="lunar">
        {lunarLabel(lunar)} · {canChiYear(lunar.year)}
      </div>
      {special && <div className="special">{special.name}</div>}
      <div className="meta">
        {timeMode === 'vn' ? `${formatClock(now.hour)} giờ Việt Nam` : `Cảnh: ${TIME_LABELS[timeMode].toLowerCase()}`}
        <br />
        {stats.visitors} người đang viếng{bots > 0 ? ` (${stats.visitors - 1} mô phỏng)` : ''} · {stats.burning} nén hương
      </div>
    </div>
  )
}

export function Tools() {
  const setPanel = useStore((s) => s.setPanel)
  return (
    <div className="tools">
      <button type="button" className="icon-btn" onClick={() => setPanel('journal')} aria-label="Nhật ký tu tập">
        <IconBook />
        <span className="label">Nhật ký</span>
      </button>
      <button type="button" className="icon-btn" onClick={() => setPanel('settings')} aria-label="Cài đặt">
        <IconSliders />
        <span className="label">Cài đặt</span>
      </button>
      <button type="button" className="icon-btn" onClick={() => setPanel('help')} aria-label="Hướng dẫn">
        <IconHelp />
        <span className="label">Hướng dẫn</span>
      </button>
    </div>
  )
}

export function ZoneBanner() {
  const zone = useStore((s) => s.zone)
  const [shown, setShown] = useState<string | null>(null)
  useEffect(() => {
    setShown(zone)
    const id = setTimeout(() => setShown(null), 3300)
    return () => clearTimeout(id)
  }, [zone])
  if (!shown) return null
  return (
    <div className="zone-banner" key={shown}>
      <div className="name">{ZONE_NAMES[zone]}</div>
      {zone === 'chinhDien' && <div className="hint">Xin đi nhẹ, nói khẽ</div>}
    </div>
  )
}

export function Toast() {
  const toast = useStore((s) => s.toast)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!toast) return
    setVisible(true)
    const id = setTimeout(() => setVisible(false), 4100)
    return () => clearTimeout(id)
  }, [toast])
  if (!toast || !visible) return null
  return (
    <div className="toast panel" key={toast.id} role="status">
      {toast.text}
    </div>
  )
}

export function Verse() {
  const verse = useStore((s) => s.verse)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!verse) return
    setVisible(true)
    const id = setTimeout(() => setVisible(false), 12200)
    return () => clearTimeout(id)
  }, [verse])
  if (!verse || !visible) return null
  return (
    <div className="verse" key={verse.id} aria-live="polite">
      {verse.lines.map((l, i) => (
        <p key={l} style={{ animationDelay: `${0.4 + i * 1.3}s` }}>
          {l}
        </p>
      ))}
      <p className="caption" style={{ animationDelay: `${0.4 + verse.lines.length * 1.3}s` }}>
        {verse.caption}
      </p>
    </div>
  )
}

export function PromptButton() {
  const prompt = useStore((s) => s.prompt)
  const activity = useStore((s) => s.activity)
  const touch = isTouchDevice()
  if (!prompt || activity) return null
  return (
    <button type="button" className="btn prompt panel" onClick={() => interact()} key={prompt.id}>
      {!touch && <kbd>E</kbd>}
      {prompt.label}
    </button>
  )
}

export function Emotes() {
  const [open, setOpen] = useState(false)
  const activity = useStore((s) => s.activity)
  useStore((s) => s.zone)
  if (activity) return null
  const phrases = sacredHere() ? [PHRASES[0]] : PHRASES
  return (
    <div className="emotes">
      {open && (
        <div className="phrases panel" role="menu">
          {phrases.map((p) => (
            <button
              type="button"
              role="menuitem"
              key={p}
              onClick={() => {
                speak(p)
                setOpen(false)
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
      <button type="button" className="btn" onClick={() => emote('pray')} title="Phím 1">
        Chắp tay
      </button>
      <button type="button" className="btn" onClick={() => emote('bow')} title="Phím 2">
        Cúi chào
      </button>
      <button type="button" className="btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        Lời chào
      </button>
    </div>
  )
}

export function MovePad() {
  const activity = useStore((s) => s.activity)
  if (!isTouchDevice() || (activity && activity.kind === 'meditate')) return null
  return <Joystick />
}

export function PerfOverlay() {
  const show = useStore((s) => s.settings.showPerf)
  const quality = useStore((s) => s.settings.quality)
  const [, tick] = useState(0)
  useEffect(() => {
    if (!show) return
    const id = setInterval(() => tick((n) => n + 1), 500)
    return () => clearInterval(id)
  }, [show])
  if (!show) return null
  const p = runtime.perf
  return (
    <div className="perf panel" data-testid="perf">
      FPS {p.fps.toFixed(0)} · {p.ms.toFixed(1)} ms
      <br />
      {p.calls} draw call · {(p.tris / 1000).toFixed(0)}k tam giác
      <br />
      DPR {p.dpr.toFixed(2)} · {QUALITY_LABELS[quality]} ({runtime.quality.level}) · {runtime.avatars.length} người
    </div>
  )
}
