import { GameLoop } from './GameLoop'
import { Atmosphere } from './render/Atmosphere'
import { BellRig } from './render/BellRig'
import { Crowd } from './render/Crowd'
import { Flag, Glows } from './render/Decor'
import { Incense } from './render/Incense'
import { NameTags } from './render/NameTags'
import { Pond } from './render/Pond'
import { StaticWorld } from './render/StaticWorld'

export function Scene() {
  return (
    <>
      <GameLoop />
      <Atmosphere />
      <StaticWorld />
      <Pond />
      <Incense />
      <BellRig />
      <Flag />
      <Glows />
      <Crowd />
      <NameTags />
    </>
  )
}
