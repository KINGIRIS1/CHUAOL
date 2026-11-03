/**
 * Âm thanh tổng hợp bằng Web Audio — tạm thời cho bản chơi thử.
 * Bản chính thức sẽ dùng bản thu âm thật (chuông, mõ, tụng kinh) có giấy phép của chùa đối tác.
 */

type Vec3 = { x: number; y: number; z: number }

interface PannerOpts {
  ref?: number
  rolloff?: number
}

/** Các partial của chuông đồng lớn: [tỉ lệ tần số, biên độ, thời gian tắt (giây)] */
const BELL_PARTIALS: Array<[number, number, number]> = [
  [0.5, 0.5, 13],
  [1, 0.55, 10],
  [1.19, 0.32, 7.5],
  [1.5, 0.18, 6],
  [2, 0.42, 5],
  [2.51, 0.16, 3.6],
  [2.66, 0.14, 3],
  [3.01, 0.11, 2.4],
  [4.17, 0.08, 1.7],
  [5.43, 0.05, 1.1],
  [6.8, 0.03, 0.7],
]

const SMALL_BELL_PARTIALS: Array<[number, number, number]> = [
  [1, 0.5, 6.5],
  [2.71, 0.26, 4],
  [5.2, 0.12, 2.2],
  [8.4, 0.05, 1.2],
]

class AudioEngine {
  ctx: AudioContext | null = null
  private master!: GainNode
  private sfx!: GainNode
  private reverbIn!: GainNode
  private ambient!: GainNode
  private wind!: GainNode
  private noise!: AudioBuffer
  private volume = 0.8
  private nextBird = 0
  private nextCricket = 0
  private listenerPos: Vec3 = { x: 0, y: 1.6, z: 0 }

  get ready() {
    return this.ctx !== null && this.ctx.state === 'running'
  }

  /** Gọi trong sự kiện chạm/nhấp đầu tiên (chính sách autoplay của trình duyệt). */
  init() {
    if (this.ctx) {
      void this.ctx.resume()
      return
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = this.volume
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -16
    comp.ratio.value = 3
    this.master.connect(comp).connect(ctx.destination)

    this.sfx = ctx.createGain()
    this.sfx.connect(this.master)
    this.ambient = ctx.createGain()
    this.ambient.gain.value = 0.9
    this.ambient.connect(this.master)

    const convolver = ctx.createConvolver()
    convolver.buffer = this.impulse(3.4, 2.6)
    this.reverbIn = ctx.createGain()
    const wet = ctx.createGain()
    wet.gain.value = 0.55
    this.reverbIn.connect(convolver).connect(wet).connect(this.master)

    const len = ctx.sampleRate * 2
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = this.noise.getChannelData(0)
    // Nhiễu hồng (pink noise) cho gió và nước
    let b0 = 0
    let b1 = 0
    let b2 = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      b0 = 0.99765 * b0 + w * 0.099046
      b1 = 0.963 * b1 + w * 0.2965164
      b2 = 0.57 * b2 + w * 1.0526913
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18
    }
    this.startAmbience()
  }

  setVolume(v: number) {
    this.volume = v
    if (this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05)
  }

  updateListener(pos: Vec3, forward: Vec3) {
    this.listenerPos = pos
    const ctx = this.ctx
    if (!ctx) return
    const l = ctx.listener
    if (l.positionX) {
      const t = ctx.currentTime
      l.positionX.setTargetAtTime(pos.x, t, 0.03)
      l.positionY.setTargetAtTime(pos.y, t, 0.03)
      l.positionZ.setTargetAtTime(pos.z, t, 0.03)
      l.forwardX.setTargetAtTime(forward.x, t, 0.03)
      l.forwardY.setTargetAtTime(forward.y, t, 0.03)
      l.forwardZ.setTargetAtTime(forward.z, t, 0.03)
      l.upX.value = 0
      l.upY.value = 1
      l.upZ.value = 0
    } else {
      l.setPosition(pos.x, pos.y, pos.z)
      l.setOrientation(forward.x, forward.y, forward.z, 0, 1, 0)
    }
  }

  /** Cập nhật âm nền theo thời gian trong ngày. */
  update(night: number) {
    const ctx = this.ctx
    if (!ctx) return
    const now = ctx.currentTime
    const gust = 0.03 + 0.022 * Math.sin(now * 0.13) + 0.012 * Math.sin(now * 0.41 + 1.3)
    this.wind.gain.setTargetAtTime(Math.max(0.008, gust), now, 0.8)
    if (night < 0.6 && now > this.nextBird) {
      this.nextBird = now + 2.5 + Math.random() * 6
      this.birdCall()
    }
    if (night > 0.5 && now > this.nextCricket) {
      this.nextCricket = now + 0.7 + Math.random() * 1.6
      this.cricket()
    }
  }

  /* --------------------------- Âm thanh sự kiện --------------------------- */

  bell(pos: Vec3, strength = 1) {
    const ctx = this.ctx
    if (!ctx) return
    const t0 = ctx.currentTime + 0.01
    const out = ctx.createGain()
    out.gain.value = 0.5 * strength
    this.route(out, pos, { ref: 7, rolloff: 0.6 }, 0.7)
    const f0 = 96
    for (const [r, a, dur] of BELL_PARTIALS) {
      for (const det of [-0.21, 0.21]) {
        const o = ctx.createOscillator()
        o.frequency.value = f0 * r + det * r
        const g = ctx.createGain()
        g.gain.setValueAtTime(0, t0)
        g.gain.linearRampToValueAtTime(a * 0.5, t0 + 0.006)
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
        o.connect(g).connect(out)
        o.start(t0)
        o.stop(t0 + dur + 0.1)
      }
    }
    // Tiếng chày gỗ chạm vào chuông
    this.noiseBurst(out, t0, 0.28, 'lowpass', 380, 0.9)
    const thump = ctx.createOscillator()
    thump.frequency.setValueAtTime(70, t0)
    thump.frequency.exponentialRampToValueAtTime(45, t0 + 0.3)
    const tg = ctx.createGain()
    tg.gain.setValueAtTime(0.5, t0)
    tg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35)
    thump.connect(tg).connect(out)
    thump.start(t0)
    thump.stop(t0 + 0.4)
  }

  smallBell(pos?: Vec3, strength = 1) {
    const ctx = this.ctx
    if (!ctx) return
    const t0 = ctx.currentTime + 0.01
    const out = ctx.createGain()
    out.gain.value = 0.22 * strength
    if (pos) this.route(out, pos, { ref: 3, rolloff: 1 }, 0.4)
    else {
      out.connect(this.sfx)
      out.connect(this.reverbIn)
    }
    for (const [r, a, dur] of SMALL_BELL_PARTIALS) {
      for (const det of [-0.6, 0.6]) {
        const o = ctx.createOscillator()
        o.frequency.value = 520 * r + det
        const g = ctx.createGain()
        g.gain.setValueAtTime(0, t0)
        g.gain.linearRampToValueAtTime(a * 0.5, t0 + 0.004)
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
        o.connect(g).connect(out)
        o.start(t0)
        o.stop(t0 + dur + 0.05)
      }
    }
  }

  woodfish(pos: Vec3, strength = 1) {
    const ctx = this.ctx
    if (!ctx) return
    const t0 = ctx.currentTime + 0.005
    const out = ctx.createGain()
    out.gain.value = 0.55 * strength
    this.route(out, pos, { ref: 2.5, rolloff: 1.3 }, 0.35)
    const o = ctx.createOscillator()
    o.frequency.setValueAtTime(660, t0)
    o.frequency.exponentialRampToValueAtTime(560, t0 + 0.05)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(0.9, t0 + 0.002)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.17)
    o.connect(g).connect(out)
    o.start(t0)
    o.stop(t0 + 0.2)
    const o2 = ctx.createOscillator()
    o2.type = 'triangle'
    o2.frequency.value = 1290
    const g2 = ctx.createGain()
    g2.gain.setValueAtTime(0.25, t0)
    g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05)
    o2.connect(g2).connect(out)
    o2.start(t0)
    o2.stop(t0 + 0.07)
    this.noiseBurst(out, t0, 0.025, 'bandpass', 2400, 0.5)
  }

  incense(pos: Vec3) {
    const ctx = this.ctx
    if (!ctx) return
    const out = ctx.createGain()
    out.gain.value = 0.35
    this.route(out, pos, { ref: 1.5, rolloff: 1.5 }, 0.1)
    this.noiseBurst(out, ctx.currentTime + 0.01, 0.7, 'highpass', 2600, 0.5, 0.12)
  }

  plop(pos: Vec3) {
    const ctx = this.ctx
    if (!ctx) return
    const t0 = ctx.currentTime + 0.01
    const out = ctx.createGain()
    out.gain.value = 0.45
    this.route(out, pos, { ref: 2, rolloff: 1.4 }, 0.25)
    const o = ctx.createOscillator()
    o.frequency.setValueAtTime(260, t0)
    o.frequency.exponentialRampToValueAtTime(760, t0 + 0.07)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.4, t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13)
    o.connect(g).connect(out)
    o.start(t0)
    o.stop(t0 + 0.15)
    this.noiseBurst(out, t0, 0.3, 'lowpass', 700, 0.4)
  }

  /** Tiếng nhỏ, nhẹ cho thao tác giao diện. */
  chime() {
    const ctx = this.ctx
    if (!ctx) return
    const t0 = ctx.currentTime + 0.01
    for (const [f, a] of [
      [880, 0.06],
      [1318.5, 0.035],
    ]) {
      const o = ctx.createOscillator()
      o.frequency.value = f
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.exponentialRampToValueAtTime(a, t0 + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7)
      o.connect(g).connect(this.sfx)
      g.connect(this.reverbIn)
      o.start(t0)
      o.stop(t0 + 0.75)
    }
  }

  /* ------------------------------ Nội bộ ------------------------------ */

  private route(node: AudioNode, pos: Vec3, opts: PannerOpts, reverbSend: number) {
    const ctx = this.ctx!
    const p = ctx.createPanner()
    p.panningModel = 'equalpower'
    p.distanceModel = 'inverse'
    p.refDistance = opts.ref ?? 3
    p.rolloffFactor = opts.rolloff ?? 1
    p.maxDistance = 120
    if (p.positionX) {
      p.positionX.value = pos.x
      p.positionY.value = pos.y
      p.positionZ.value = pos.z
    } else {
      p.setPosition(pos.x, pos.y, pos.z)
    }
    node.connect(p).connect(this.sfx)
    const send = ctx.createGain()
    send.gain.value = reverbSend
    p.connect(send).connect(this.reverbIn)
  }

  private noiseBurst(dest: AudioNode, t0: number, dur: number, type: BiquadFilterType, freq: number, gain: number, attack = 0.002) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    src.connect(f).connect(g).connect(dest)
    src.start(t0, Math.random() * 1.5)
    src.stop(t0 + dur + 0.05)
  }

  private impulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx!
    const len = Math.floor(ctx.sampleRate * seconds)
    const buf = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
    }
    return buf
  }

  private startAmbience() {
    const ctx = this.ctx!
    // Gió
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 420
    this.wind = ctx.createGain()
    this.wind.gain.value = 0
    src.connect(lp).connect(this.wind).connect(this.ambient)
    src.start()
    // Nước róc rách ở hồ sen (âm thanh 3D)
    const w = ctx.createBufferSource()
    w.buffer = this.noise
    w.loop = true
    w.playbackRate.value = 1.3
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 900
    bp.Q.value = 0.9
    const am = ctx.createGain()
    am.gain.value = 0.5
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 3.2
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.35
    lfo.connect(lfoGain).connect(am.gain)
    lfo.start()
    const wg = ctx.createGain()
    wg.gain.value = 0.22
    w.connect(bp).connect(am).connect(wg)
    this.route(wg, { x: -13, y: 0.2, z: 40 }, { ref: 3, rolloff: 1.6 }, 0.05)
    w.start()
  }

  private birdCall() {
    const ctx = this.ctx!
    const a = Math.random() * Math.PI * 2
    const r = 8 + Math.random() * 14
    const pos = { x: this.listenerPos.x + Math.cos(a) * r, y: 5 + Math.random() * 5, z: this.listenerPos.z + Math.sin(a) * r }
    const out = ctx.createGain()
    out.gain.value = 0.11
    this.route(out, pos, { ref: 4, rolloff: 0.9 }, 0.2)
    const base = 2300 + Math.random() * 1600
    const n = 2 + Math.floor(Math.random() * 3)
    let t = ctx.currentTime + 0.02
    for (let i = 0; i < n; i++) {
      const o = ctx.createOscillator()
      o.frequency.setValueAtTime(base, t)
      o.frequency.linearRampToValueAtTime(base * 1.45, t + 0.045)
      o.frequency.linearRampToValueAtTime(base * 1.1, t + 0.11)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.015)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
      o.connect(g).connect(out)
      o.start(t)
      o.stop(t + 0.14)
      t += 0.14 + Math.random() * 0.08
    }
  }

  private cricket() {
    const ctx = this.ctx!
    const a = Math.random() * Math.PI * 2
    const r = 5 + Math.random() * 10
    const pos = { x: this.listenerPos.x + Math.cos(a) * r, y: 0.2, z: this.listenerPos.z + Math.sin(a) * r }
    const out = ctx.createGain()
    out.gain.value = 0.05
    this.route(out, pos, { ref: 3, rolloff: 1 }, 0.05)
    const t0 = ctx.currentTime + 0.02
    const o = ctx.createOscillator()
    o.frequency.value = 4200 + Math.random() * 500
    const am = ctx.createGain()
    am.gain.value = 0
    const lfo = ctx.createOscillator()
    lfo.type = 'square'
    lfo.frequency.value = 26 + Math.random() * 8
    const lg = ctx.createGain()
    lg.gain.value = 0.5
    lfo.connect(lg).connect(am.gain)
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, t0)
    env.gain.exponentialRampToValueAtTime(1, t0 + 0.03)
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32)
    o.connect(am).connect(env).connect(out)
    o.start(t0)
    lfo.start(t0)
    o.stop(t0 + 0.35)
    lfo.stop(t0 + 0.35)
  }
}

export const audio = new AudioEngine()
