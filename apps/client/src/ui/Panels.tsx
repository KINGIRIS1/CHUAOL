import { useState } from 'react'
import { QUALITY_LABELS, type QualityMode, TIME_LABELS, type TimeMode } from '../config'
import { exitActivity } from '../game/activities'
import { INFO } from '../game/layout'
import { dateKey, vnNow } from '../lib/vnTime'
import { EMPTY_JOURNAL, MILESTONES, visitStreak } from '../state/journal'
import { ROBES, type RobeId, useStore } from '../state/store'
import { clearWishes, loadWishes } from '../state/wishes'
import { IconClose } from './icons'

function Modal({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  const setPanel = useStore((s) => s.setPanel)
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title} onPointerDown={(e) => e.target === e.currentTarget && setPanel('none')}>
      <div className="modal-card panel">
        <header>
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2>{title}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={() => setPanel('none')} aria-label="Đóng">
            <IconClose />
          </button>
        </header>
        {children}
      </div>
    </div>
  )
}

function JournalPanel() {
  const journal = useStore((s) => s.journal)
  const setJournal = useStore((s) => s.setJournal)
  const [confirming, setConfirming] = useState(false)
  const [wishes, setWishes] = useState(loadWishes)
  const streak = visitStreak(journal.visitDays, dateKey(vnNow()))
  const items: Array<[string, number | string]> = [
    ['Nén hương đã thắp', journal.incenseSticks],
    ['Tiếng chuông đã thỉnh', journal.bellRings],
    ['Lạy Phật', journal.prostrations],
    ['Lần niệm Phật', journal.recitations],
    ['Phút ngồi thiền', Math.floor(journal.meditationSec / 60)],
    ['Đèn hoa đăng', journal.lanterns],
    ['Ngày ghé chùa liên tiếp', streak],
  ]
  return (
    <Modal title="Nhật ký tu tập" eyebrow="Chỉ lưu trên máy của bạn">
      <p className="muted">Nhật ký ghi lại hành trình của riêng bạn. Không có bảng xếp hạng, không so sánh với ai.</p>
      <div className="stats">
        {items.map(([k, v]) => (
          <div className="stat" key={k}>
            <div className="v">{v}</div>
            <div className="k">{k}</div>
          </div>
        ))}
      </div>
      <section>
        <h3>Cột mốc</h3>
        <ul className="milestones">
          {MILESTONES.map((m) => (
            <li key={m.id} className={m.reached(journal, streak) ? 'done' : ''}>
              {m.text}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3>Lời nguyện của bạn</h3>
        {wishes.length === 0 ? (
          <p className="muted">Chưa có lời nguyện nào. Bạn có thể viết khi thắp hương hoặc thả đèn hoa đăng.</p>
        ) : (
          <ul className="wishes">
            {wishes.slice(0, 6).map((w) => (
              <li key={w.at}>
                {w.text}
                <small>
                  {w.kind === 'incense' ? 'Khi thắp hương' : 'Theo đèn hoa đăng'} · {new Date(w.at).toLocaleDateString('vi-VN')}
                </small>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="row">
        {confirming ? (
          <>
            <span>Xóa toàn bộ nhật ký và lời nguyện trên máy này?</span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setJournal({ ...EMPTY_JOURNAL, visitDays: [dateKey(vnNow())] })
                clearWishes()
                setWishes([])
                setConfirming(false)
              }}
            >
              Xóa
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => setConfirming(false)}>
              Giữ lại
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-quiet" onClick={() => setConfirming(true)}>
            Xóa nhật ký trên máy này
          </button>
        )}
      </div>
    </Modal>
  )
}

function SettingsPanel() {
  const s = useStore((st) => st.settings)
  const update = useStore((st) => st.updateSettings)
  return (
    <Modal title="Cài đặt">
      <div className="field">
        <span className="label">Chất lượng hình ảnh</span>
        <div className="segmented" role="group" aria-label="Chất lượng hình ảnh">
          {(Object.keys(QUALITY_LABELS) as QualityMode[]).map((q) => (
            <button type="button" key={q} aria-pressed={s.quality === q} onClick={() => update({ quality: q })}>
              {QUALITY_LABELS[q]}
            </button>
          ))}
        </div>
        <span className="muted">Tự động sẽ hạ độ phân giải hoặc tắt bóng đổ khi máy chạy chậm.</span>
      </div>
      <div className="field">
        <label htmlFor="time-mode">Thời gian trong ngày</label>
        <select id="time-mode" value={s.timeMode} onChange={(e) => update({ timeMode: e.target.value as TimeMode })}>
          {(Object.keys(TIME_LABELS) as TimeMode[]).map((t) => (
            <option key={t} value={t}>
              {TIME_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="volume">Âm lượng · {Math.round(s.volume * 100)}%</label>
        <input id="volume" type="range" min={0} max={1} step={0.05} value={s.volume} onChange={(e) => update({ volume: Number(e.target.value) })} />
      </div>
      <div className="field">
        <span className="label">Số khách mô phỏng</span>
        <div className="segmented" role="group" aria-label="Số khách mô phỏng">
          {[0, 10, 30, 50, 80].map((n) => (
            <button type="button" key={n} aria-pressed={s.bots === n} onClick={() => update({ bots: n })}>
              {n}
            </button>
          ))}
        </div>
        <span className="muted">Dùng để thử tải: 50 người là sức chứa dự kiến của một phòng trong bản online.</span>
      </div>
      <div className="field">
        <span className="label">Trang phục</span>
        <div className="segmented" role="group" aria-label="Trang phục">
          {(Object.keys(ROBES) as RobeId[]).map((r) => (
            <button type="button" key={r} aria-pressed={s.robe === r} onClick={() => update({ robe: r })}>
              {ROBES[r].label}
            </button>
          ))}
        </div>
      </div>
      <label className="check" htmlFor="show-perf">
        <input id="show-perf" type="checkbox" checked={s.showPerf} onChange={(e) => update({ showPerf: e.target.checked })} />
        Hiện thông số hiệu năng (FPS, draw call)
      </label>
      <div className="row">
        <button
          type="button"
          className="btn"
          onClick={() => {
            const el = document.documentElement
            if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {})
            else void el.requestFullscreen?.().catch(() => {})
          }}
        >
          Toàn màn hình
        </button>
      </div>
    </Modal>
  )
}

function HelpPanel() {
  return (
    <Modal title="Hướng dẫn" eyebrow="Bản chơi thử 0.1">
      <section>
        <h3>Điều khiển</h3>
        <ul className="help-list">
          <li>
            Máy tính: <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> hoặc phím mũi tên để đi, giữ <kbd>Shift</kbd> để đi nhanh ngoài sân, kéo chuột để nhìn quanh, cuộn chuột để
            thu phóng.
          </li>
          <li>
            Điện thoại: kéo vòng tròn bên trái để đi, vuốt màn hình để nhìn quanh, chụm hai ngón để thu phóng.
          </li>
          <li>
            <kbd>E</kbd> để tương tác, <kbd>Esc</kbd> để rời, <kbd>1</kbd> chắp tay, <kbd>2</kbd> cúi chào, phím cách để gõ mõ.
          </li>
        </ul>
      </section>
      <section>
        <h3>Trong chùa có gì</h3>
        <ul className="help-list">
          <li>Lư hương giữa sân: thắp hương, có thể kèm lời nguyện riêng.</li>
          <li>Gác chuông bên phải: thỉnh chuông, cả sân cùng nghe.</li>
          <li>Chính điện: lễ Phật ở bồ đoàn giữa, gõ mõ niệm Phật bên trái bàn thờ.</li>
          <li>Cây bồ đề bên trái sân: ngồi thiền có vòng thở hướng dẫn.</li>
          <li>Hồ sen ngoài cổng: thả đèn hoa đăng.</li>
          <li>Các bảng gỗ nhỏ: đọc giới thiệu về từng công trình.</li>
        </ul>
      </section>
      <section>
        <h3>Về bản chơi thử</h3>
        <p className="muted">
          Bản này chạy hoàn toàn trên máy bạn, chưa có máy chủ. Người khác trong chùa là khách mô phỏng để thử cảm giác đông người và đo hiệu năng. Kiến trúc, tượng và âm thanh được
          dựng tạm bằng code, sẽ được thay bằng mô hình 3D và bản thu âm thật. Nội dung nghi lễ đang chờ cố vấn Phật giáo duyệt.
        </p>
      </section>
    </Modal>
  )
}

export function Panels() {
  const panel = useStore((s) => s.panel)
  if (panel === 'journal') return <JournalPanel />
  if (panel === 'settings') return <SettingsPanel />
  if (panel === 'help') return <HelpPanel />
  return null
}

export function InfoCard() {
  const info = useStore((s) => s.info)
  if (!info) return null
  const entry = INFO[info]
  return (
    <aside className="info-card panel" aria-live="polite">
      <p className="eyebrow">Tìm hiểu</p>
      <h2>{entry.title}</h2>
      <p>{entry.body}</p>
      <p className="foot">Nội dung tham khảo trong bản chơi thử, sẽ được cố vấn Phật giáo duyệt lại.</p>
      <button type="button" className="btn btn-quiet close" onClick={() => exitActivity()}>
        Đóng
      </button>
    </aside>
  )
}
