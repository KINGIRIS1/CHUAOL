import { useEffect } from 'react'
import { resetLabelCache } from '../game/render/NameTags'
import { urlParams, useStore } from '../state/store'
import { ActivityLayer, MeditationLayer } from './Activity'
import { DateCard, Emotes, MovePad, PerfOverlay, PromptButton, Toast, Tools, Verse, ZoneBanner } from './Hud'
import { InfoCard, Panels } from './Panels'
import { StartScreen, enterTemple } from './StartScreen'

export function Ui() {
  const started = useStore((s) => s.started)
  const meditating = useStore((s) => s.activity?.kind === 'meditate' && s.activity.phase === 'active')

  useEffect(() => {
    // Vẽ lại nhãn tên sau khi font tiếng Việt tải xong
    document.fonts?.ready.then(resetLabelCache, () => {})
    if (urlParams.autostart) enterTemple()
  }, [])

  if (!started)
    return (
      <div className="ui">
        <StartScreen />
      </div>
    )

  return (
    <div className={`ui${meditating ? ' is-meditating' : ''}`}>
      <div className="topbar">
        <div className="topbar-left">
          <DateCard />
          <PerfOverlay />
        </div>
        <Tools />
      </div>
      <ZoneBanner />
      <Toast />
      <Verse />
      <InfoCard />
      <MeditationLayer />
      <div className="bottom">
        <div className="left">
          <MovePad />
        </div>
        <div className="center">
          <ActivityLayer />
          <PromptButton />
        </div>
        <div className="right">
          <Emotes />
        </div>
      </div>
      <Panels />
    </div>
  )
}
