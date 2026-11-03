import { create } from 'zustand'
import type { QualityMode, TimeMode } from '../config'
import { readUrlParams } from '../config'
import type { InfoId, InteractKind, ZoneId } from '../game/layout'
import { loadJSON, saveJSON } from '../lib/storage'
import { type Journal, loadJournal, saveJournal } from './journal'

export type RobeId = 'lam' | 'nau' | 'trang' | 'aodai'

export const ROBES: Record<RobeId, { label: string; color: string }> = {
  lam: { label: 'Áo lam', color: '#6f86a6' },
  nau: { label: 'Áo nâu', color: '#7c5a43' },
  trang: { label: 'Áo trắng', color: '#e6dfcf' },
  aodai: { label: 'Áo dài', color: '#c2645a' },
}

export interface Settings {
  quality: QualityMode
  timeMode: TimeMode
  volume: number
  bots: number
  showPerf: boolean
  robe: RobeId
}

export type Panel = 'none' | 'journal' | 'settings' | 'help'

export interface UIActivity {
  kind: InteractKind
  phase: 'approach' | 'setup' | 'perform' | 'active'
}

export interface Prompt {
  id: string
  label: string
}

interface UIState {
  started: boolean
  prompt: Prompt | null
  activity: UIActivity | null
  zone: ZoneId
  toast: { id: number; text: string } | null
  verse: { id: number; lines: string[]; caption: string } | null
  info: InfoId | null
  panel: Panel
  settings: Settings
  stats: { burning: number; visitors: number; lanterns: number }
  chant: { count: number; syllable: number }
  worship: { count: number }
  journal: Journal
  setStarted: (v: boolean) => void
  setPrompt: (p: Prompt | null) => void
  setActivity: (a: UIActivity | null) => void
  setZone: (z: ZoneId) => void
  showToast: (text: string) => void
  showVerse: (lines: string[], caption: string) => void
  setInfo: (id: InfoId | null) => void
  setPanel: (p: Panel) => void
  updateSettings: (s: Partial<Settings>) => void
  setStats: (s: UIState['stats']) => void
  setChant: (c: UIState['chant']) => void
  setWorship: (w: UIState['worship']) => void
  addJournal: (patch: Partial<Record<Exclude<keyof Journal, 'visitDays'>, number>>) => void
  setJournal: (j: Journal) => void
}

const SETTINGS_KEY = 'chuaol.settings.v1'
const url = readUrlParams()

const defaults: Settings = { quality: 'auto', timeMode: 'vn', volume: 0.8, bots: 30, showPerf: false, robe: 'lam' }
const saved = loadJSON<Settings>(SETTINGS_KEY, defaults)
const initialSettings: Settings = {
  ...saved,
  bots: url.bots ?? saved.bots,
  quality: url.quality ?? saved.quality,
  timeMode: url.time ?? saved.timeMode,
  showPerf: url.perf || saved.showPerf,
}

let toastId = 0

export const useStore = create<UIState>((set, get) => ({
  started: false,
  prompt: null,
  activity: null,
  zone: 'loiVao',
  toast: null,
  verse: null,
  info: null,
  panel: 'none',
  settings: initialSettings,
  stats: { burning: 0, visitors: 1, lanterns: 0 },
  chant: { count: 0, syllable: -1 },
  worship: { count: 0 },
  journal: loadJournal(),
  setStarted: (started) => set({ started }),
  setPrompt: (prompt) => {
    const cur = get().prompt
    if (cur?.id === prompt?.id && cur?.label === prompt?.label) return
    set({ prompt })
  },
  setActivity: (activity) => set({ activity }),
  setZone: (zone) => set({ zone }),
  showToast: (text) => set({ toast: { id: ++toastId, text } }),
  showVerse: (lines, caption) => set({ verse: { id: ++toastId, lines, caption } }),
  setInfo: (info) => set({ info }),
  setPanel: (panel) => set({ panel }),
  updateSettings: (s) => {
    const settings = { ...get().settings, ...s }
    saveJSON(SETTINGS_KEY, settings)
    set({ settings })
  },
  setStats: (stats) => {
    const cur = get().stats
    if (cur.burning === stats.burning && cur.visitors === stats.visitors && cur.lanterns === stats.lanterns) return
    set({ stats })
  },
  setChant: (chant) => set({ chant }),
  setWorship: (worship) => set({ worship }),
  addJournal: (patch) => {
    const j = { ...get().journal }
    for (const [k, v] of Object.entries(patch) as Array<[Exclude<keyof Journal, 'visitDays'>, number]>) j[k] += v
    saveJournal(j)
    set({ journal: j })
  },
  setJournal: (journal) => {
    saveJournal(journal)
    set({ journal })
  },
}))

export const urlParams = url
