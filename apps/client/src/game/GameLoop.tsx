import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { type PerspectiveCamera, Vector3 } from 'three'
import { PRESETS, type QualityLevel, TIME_HOURS, detectQuality } from '../config'
import { vnNow } from '../lib/vnTime'
import { ROBES, useStore } from '../state/store'
import { emote, exitActivity, findInteractable, interact, promptFor, ringAgain, tapWoodfish } from './activities'
import { blendPose } from './actors/avatarRig'
import { createAvatar, lookVersion } from './actors/avatars'
import { setBotCount, updateBots } from './actors/bots'
import { audio } from './audio/engine'
import { beginFollow, updateCamera } from './camera'
import { attachKeyboard, attachPointerLook, onAction } from './input'
import { L, ZONE_NAMES, interactables, zoneAt } from './layout'
import { updatePlayer } from './player'
import { player, runtime } from './runtime'
import { seedIncense, seedLanterns, updateBell, updateIncense, updateLanterns, updateSmoke } from './systems'

/** Cờ cho UI báo GameLoop chuyển camera sang theo người chơi (camera chỉ truy cập được trong Canvas). */
export const loopFlags = { followRequested: false }

const LEVELS: QualityLevel[] = ['low', 'medium', 'high']
const FWD = new Vector3()

function initWorld() {
  if (runtime.avatars.length) return
  const me = createAvatar(0, 'Bạn', true)
  me.x = L.spawn.x
  me.z = L.spawn.z
  me.yaw = L.spawn.yaw
  me.robe.set(ROBES[useStore.getState().settings.robe].color)
  me.skin.set('#e2b994')
  me.hair.set('#1d1714')
  runtime.avatars.push(me)
  setBotCount(useStore.getState().settings.bots)
  seedIncense(26)
  seedLanterns(7)
}

function separate() {
  const list = runtime.avatars
  const min = 0.62
  for (let i = 0; i < list.length; i++) {
    const a = list[i]
    if (!a.active) continue
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j]
      if (!b.active) continue
      const dx = b.x - a.x
      const dz = b.z - a.z
      const d2 = dx * dx + dz * dz
      if (d2 >= min * min || d2 < 1e-8) continue
      const d = Math.sqrt(d2)
      const push = (min - d) / d
      const wa = a.anchored ? 0 : b.anchored ? 1 : 0.5
      const wb = b.anchored ? 0 : a.anchored ? 1 : 0.5
      a.x -= dx * push * wa
      a.z -= dz * push * wa
      b.x += dx * push * wb
      b.z += dz * push * wb
    }
  }
}

export function GameLoop() {
  const { camera, gl, setDpr } = useThree()
  const level = useRef<QualityLevel>('medium')
  const dprScale = useRef(1)
  const perf = useRef({ frames: 0, acc: 0, slow: 0, fast: 0 })
  const stats = useRef({ acc: 0, hour: -1, zone: '' as string, sacredToastAt: -100 })

  useEffect(() => {
    initWorld()
    const s = useStore.getState().settings
    level.current = s.quality === 'auto' ? detectQuality() : s.quality
    runtime.quality = PRESETS[level.current]
    const applyDpr = () => setDpr(Math.min(window.devicePixelRatio || 1, runtime.quality.maxDpr) * dprScale.current)
    applyDpr()

    const detachKeys = attachKeyboard()
    const detachLook = attachPointerLook(gl.domElement)
    onAction((act) => {
      if (act === 'interact') interact()
      else if (act === 'exit') {
        if (useStore.getState().panel !== 'none') useStore.getState().setPanel('none')
        else exitActivity()
      } else if (act === 'tap') {
        const a = runtime.activity
        if (a?.kind === 'woodfish') tapWoodfish()
        else if (a?.kind === 'bell') ringAgain()
      } else if (act === 'emotePray') emote('pray')
      else if (act === 'emoteBow') emote('bow')
    })

    const unsub = useStore.subscribe((st, prev) => {
      const a = st.settings
      const b = prev.settings
      if (a.bots !== b.bots) setBotCount(a.bots)
      if (a.robe !== b.robe) {
        player().robe.set(ROBES[a.robe].color)
        lookVersion.value++
      }
      if (a.volume !== b.volume) audio.setVolume(a.volume)
      if (a.quality !== b.quality) {
        level.current = a.quality === 'auto' ? detectQuality() : a.quality
        dprScale.current = 1
        runtime.quality = PRESETS[level.current]
        applyDpr()
      }
    })
    return () => {
      detachKeys()
      detachLook()
      unsub()
    }
  }, [gl, setDpr])

  useFrame((_state, delta) => {
    const dt = Math.min(delta, runtime.maxDt)
    runtime.time += dt
    const st = useStore.getState()

    // Giờ trong ngày: theo giờ Việt Nam hoặc cảnh cố định, chuyển mượt khi đổi
    const mode = st.settings.timeMode
    const targetHour = mode === 'vn' ? vnNow().hour : TIME_HOURS[mode]
    const env = runtime.env
    if (stats.current.hour < 0) env.hour = targetHour
    else {
      let d = ((targetHour - env.hour + 36) % 24) - 12
      if (Math.abs(d) < 0.01) d = 0
      env.hour = (env.hour + Math.sign(d) * Math.min(Math.abs(d), dt * 4) + 24) % 24
    }
    stats.current.hour = env.hour

    if (loopFlags.followRequested) {
      loopFlags.followRequested = false
      beginFollow(camera as PerspectiveCamera)
    }

    if (runtime.started) updatePlayer(dt)
    updateBots(dt)
    separate()
    for (const a of runtime.avatars) blendPose(a, dt)
    updateIncense()
    updateSmoke(dt)
    updateLanterns(dt)
    updateBell(dt)

    const me = player()
    if (runtime.started) {
      // Gợi ý tương tác
      if (!runtime.activity) {
        const it = findInteractable(me.x, me.z)
        st.setPrompt(it ? { id: it.id, label: promptFor(it) } : null)
      }
      if (st.info) {
        const p = interactables.find((i) => i.infoId === st.info)
        if (p && Math.hypot(p.x - me.x, p.z - me.z) > p.radius + 1.6) st.setInfo(null)
      }
      // Vùng hiện tại
      const zone = zoneAt(me.x, me.z)
      if (zone !== stats.current.zone) {
        stats.current.zone = zone
        st.setZone(zone)
        if (zone === 'chinhDien' && runtime.time - stats.current.sacredToastAt > 40) {
          stats.current.sacredToastAt = runtime.time
          st.showToast(`Bạn đang vào ${ZONE_NAMES.chinhDien}. Xin đi nhẹ, nói khẽ.`)
        }
      }
    }

    updateCamera(camera as PerspectiveCamera, dt)
    audio.updateListener(camera.position, camera.getWorldDirection(FWD))
    audio.update(env.night)

    // Thống kê cho giao diện, 2 lần mỗi giây
    stats.current.acc += dt
    if (stats.current.acc > 0.5) {
      stats.current.acc = 0
      st.setStats({ burning: runtime.incense.length, visitors: runtime.avatars.filter((a) => a.active).length, lanterns: runtime.lanterns.length })
    }

    // Đo hiệu năng và tự điều chỉnh khi ở chế độ Tự động
    const p = perf.current
    p.frames++
    p.acc += delta
    if (p.acc >= 1) {
      const fps = p.frames / p.acc
      runtime.perf.fps = fps
      runtime.perf.ms = (p.acc / p.frames) * 1000
      runtime.perf.calls = gl.info.render.calls
      runtime.perf.tris = gl.info.render.triangles
      runtime.perf.dpr = gl.getPixelRatio()
      p.frames = 0
      p.acc = 0
      if (st.settings.quality === 'auto' && runtime.started && document.visibilityState === 'visible') {
        p.slow = fps < 26 ? p.slow + 1 : 0
        p.fast = fps > 56 ? p.fast + 1 : 0
        if (p.slow >= 3) {
          p.slow = 0
          if (dprScale.current > 0.7) dprScale.current -= 0.15
          else if (level.current !== 'low') {
            level.current = LEVELS[LEVELS.indexOf(level.current) - 1]
            runtime.quality = PRESETS[level.current]
            dprScale.current = 1
          }
          setDpr(Math.min(window.devicePixelRatio || 1, runtime.quality.maxDpr) * dprScale.current)
        } else if (p.fast >= 6 && dprScale.current < 1) {
          p.fast = 0
          dprScale.current = Math.min(1, dprScale.current + 0.1)
          setDpr(Math.min(window.devicePixelRatio || 1, runtime.quality.maxDpr) * dprScale.current)
        }
      }
    }
  })

  return null
}
