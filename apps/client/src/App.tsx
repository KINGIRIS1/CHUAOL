import { Canvas } from '@react-three/fiber'
import { NeutralToneMapping } from 'three'
import { Scene } from './game/Scene'
import { Ui } from './ui/Ui'

export function App() {
  return (
    <div className="app">
      <Canvas
        className="stage"
        shadows="percentage"
        dpr={1}
        camera={{ fov: 55, near: 0.1, far: 900, position: [30, 16, 44] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = NeutralToneMapping
        }}
      >
        <Scene />
      </Canvas>
      <Ui />
    </div>
  )
}
