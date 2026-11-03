import { useEffect, useRef, useState } from 'react'
import { confirmSetup, exitActivity, ringAgain, tapWoodfish } from '../game/activities'
import { runtime } from '../game/runtime'
import { RECITATION } from '../game/systems'
import { useStore } from '../state/store'
import { addWish } from '../state/wishes'

function Leave({ label = 'Rời đi' }: { label?: string }) {
  return (
    <button type="button" className="btn btn-quiet" onClick={() => exitActivity()}>
      {label}
    </button>
  )
}

function IncenseSetup() {
  const [sticks, setSticks] = useState(3)
  const [wish, setWish] = useState('')
  return (
    <form
      className="sheet panel"
      onSubmit={(e) => {
        e.preventDefault()
        addWish('incense', wish)
        confirmSetup({ sticks })
      }}
    >
      <h2>Thắp hương</h2>
      <p className="muted">Lời nguyện là tùy ý và chỉ được lưu trên máy của bạn.</p>
      <div className="row">
        <div className="segmented" role="group" aria-label="Số nén hương">
          {[1, 3].map((n) => (
            <button type="button" key={n} aria-pressed={sticks === n} onClick={() => setSticks(n)}>
              {n} nén
            </button>
          ))}
        </div>
      </div>
      <textarea id="incense-wish" aria-label="Lời nguyện" maxLength={200} placeholder="Con xin nguyện cho gia đình được bình an…" value={wish} onChange={(e) => setWish(e.target.value)} />
      <div className="row end">
        <Leave label="Để sau" />
        <button type="submit" className="btn btn-primary">
          Thắp hương
        </button>
      </div>
    </form>
  )
}

function LanternSetup() {
  const [wish, setWish] = useState('')
  return (
    <form
      className="sheet panel"
      onSubmit={(e) => {
        e.preventDefault()
        addWish('lantern', wish)
        confirmSetup({})
      }}
    >
      <h2>Thả đèn hoa đăng</h2>
      <p className="muted">Gửi một lời tri ân hoặc cầu nguyện theo ngọn đèn. Lời của bạn chỉ lưu trên máy này.</p>
      <textarea id="lantern-wish" aria-label="Lời tri ân" maxLength={200} placeholder="Con xin tri ân cha mẹ…" value={wish} onChange={(e) => setWish(e.target.value)} />
      <div className="row end">
        <Leave label="Để sau" />
        <button type="submit" className="btn btn-primary">
          Thả đèn
        </button>
      </div>
    </form>
  )
}

function MeditationSetup() {
  const [minutes, setMinutes] = useState(3)
  return (
    <div className="sheet panel">
      <h2>Ngồi thiền</h2>
      <p className="muted">Thả lỏng vai, hít thở tự nhiên. Chuông nhỏ sẽ báo khi hết giờ.</p>
      <div className="segmented" role="group" aria-label="Thời gian thiền">
        {[1, 3, 5, 10].map((m) => (
          <button type="button" key={m} aria-pressed={minutes === m} onClick={() => setMinutes(m)}>
            {m} phút
          </button>
        ))}
      </div>
      <div className="row end">
        <Leave label="Để sau" />
        <button type="button" className="btn btn-primary" onClick={() => confirmSetup({ minutes })}>
          Bắt đầu
        </button>
      </div>
    </div>
  )
}

/** Vòng thở: hít vào 4 giây, giữ 1 giây, thở ra 5 giây. */
function Meditation() {
  const circle = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)
  const timer = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    const loop = () => {
      const act = runtime.activity
      if (act && act.kind === 'meditate') {
        const t = act.t
        const c = t % 10
        let s: number
        let text: string
        if (c < 4) {
          s = c / 4
          text = 'Hít vào'
        } else if (c < 5) {
          s = 1
          text = 'Giữ nhẹ'
        } else {
          s = 1 - (c - 5) / 5
          text = 'Thở ra'
        }
        const eased = 0.5 - 0.5 * Math.cos(s * Math.PI)
        if (circle.current) circle.current.style.transform = `scale(${0.72 + eased * 0.38})`
        if (label.current && label.current.textContent !== text) label.current.textContent = text
        const remain = Math.max(0, Number(act.data.minutes) * 60 - t)
        if (timer.current) timer.current.textContent = `còn ${Math.floor(remain / 60)}:${String(Math.floor(remain % 60)).padStart(2, '0')}`
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div className="meditation">
      <div className="breath" ref={circle}>
        <span ref={label}>Hít vào</span>
      </div>
      <div className="timer" ref={timer} />
      <button type="button" className="btn meditation-exit" onClick={() => exitActivity()}>
        Kết thúc
      </button>
    </div>
  )
}

function Woodfish() {
  const chant = useStore((s) => s.chant)
  return (
    <>
      <div className="recite" aria-live="polite">
        {RECITATION.map((w, i) => (
          <span key={w} className={i <= chant.syllable ? 'on' : ''}>
            {w}
          </span>
        ))}
      </div>
      <button
        type="button"
        className="mo-btn"
        onPointerDown={(e) => {
          e.preventDefault()
          tapWoodfish()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') tapWoodfish()
        }}
      >
        Gõ mõ
      </button>
      <div className="caption-card panel">
        Mỗi tiếng mõ một chữ. Đã niệm {chant.count} lần · <span className="muted">phím cách để gõ</span> <Leave />
      </div>
    </>
  )
}

function Bell() {
  return (
    <div className="sheet panel">
      <h2>Thỉnh chuông</h2>
      <p className="muted">Mỗi lần thỉnh, đợi tiếng chuông ngân hết rồi hãy thỉnh tiếp.</p>
      <div className="row end">
        <Leave />
        <button type="button" className="btn btn-primary" onClick={() => ringAgain()}>
          Thỉnh thêm một tiếng
        </button>
      </div>
    </div>
  )
}

function Worship() {
  const count = useStore((s) => s.worship.count)
  return (
    <div className="caption-card panel">
      Kính lạy Đức Phật · {Math.max(1, Math.min(3, count + 1))}/3 <Leave label="Dừng" />
    </div>
  )
}

export function ActivityLayer() {
  const activity = useStore((s) => s.activity)
  if (!activity || activity.phase === 'approach') return null
  const { kind, phase } = activity
  if (kind === 'incense') return phase === 'setup' ? <IncenseSetup /> : <div className="caption-card panel">Thành tâm khấn nguyện…</div>
  if (kind === 'lantern') return phase === 'setup' ? <LanternSetup /> : <div className="caption-card panel">Nhẹ nhàng thả đèn xuống mặt hồ…</div>
  if (kind === 'meditate') return phase === 'setup' ? <MeditationSetup /> : null
  if (kind === 'woodfish') return <Woodfish />
  if (kind === 'bell') return <Bell />
  if (kind === 'worship') return <Worship />
  return null
}

export function MeditationLayer() {
  const activity = useStore((s) => s.activity)
  if (activity?.kind !== 'meditate' || activity.phase !== 'active') return null
  return <Meditation />
}
