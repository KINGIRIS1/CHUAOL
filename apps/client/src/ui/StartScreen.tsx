import { isTouchDevice } from '../config'
import { audio } from '../game/audio/engine'
import { loopFlags } from '../game/GameLoop'
import { runtime } from '../game/runtime'
import { dateKey, vnNow } from '../lib/vnTime'
import { withVisit } from '../state/journal'
import { ROBES, type RobeId, useStore } from '../state/store'

export function enterTemple() {
  const st = useStore.getState()
  audio.init()
  audio.setVolume(st.settings.volume)
  audio.smallBell(undefined, 0.7)
  runtime.started = true
  runtime.camera.mode = 'follow'
  loopFlags.followRequested = true
  st.setJournal(withVisit(st.journal, dateKey(vnNow())))
  st.setStarted(true)
}

export function StartScreen() {
  const robe = useStore((s) => s.settings.robe)
  const update = useStore((s) => s.updateSettings)
  const touch = isTouchDevice()
  return (
    <div className="start">
      <div className="start-card">
        <p className="eyebrow">Bản chơi thử 0.1</p>
        <h1>
          Chùa <span>Online</span>
        </h1>
        <p className="lede">Một khoảng sân chùa yên tĩnh ngay trên trình duyệt. Thắp nén hương, thỉnh một hồi chuông, ngồi thiền dưới gốc bồ đề.</p>
        <fieldset className="robes">
          <legend>Trang phục khi đi lễ</legend>
          {(Object.keys(ROBES) as RobeId[]).map((id) => (
            <label key={id} className="robe">
              <input type="radio" name="robe" id={`robe-${id}`} value={id} checked={robe === id} onChange={() => update({ robe: id })} />
              <span className="swatch" style={{ background: ROBES[id].color }} />
              {ROBES[id].label}
            </label>
          ))}
        </fieldset>
        <div className="start-actions">
          <button type="button" className="btn btn-primary" id="enter" onClick={enterTemple}>
            Bước vào chùa
          </button>
          <p className="controls">
            {touch ? (
              'Kéo vòng tròn bên trái để đi, vuốt màn hình để nhìn quanh.'
            ) : (
              <>
                <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> để đi, kéo chuột để nhìn quanh, <kbd>E</kbd> để tương tác.
              </>
            )}
          </p>
        </div>
        <p className="note">
          Người khác trong chùa là khách mô phỏng. Hình ảnh và âm thanh được dựng tạm bằng code; nội dung nghi lễ chưa qua cố vấn Phật giáo duyệt.
        </p>
      </div>
    </div>
  )
}
