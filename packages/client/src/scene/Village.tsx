import { CANAL, HOUSE_BOX, HOUSE_DOOR, WORLD_BOUNDS } from '../game/layout'
import { Person } from './Person'

const houseCenter: [number, number] = [(HOUSE_BOX.min[0] + HOUSE_BOX.max[0]) / 2, (HOUSE_BOX.min[1] + HOUSE_BOX.max[1]) / 2]
const houseW = HOUSE_BOX.max[0] - HOUSE_BOX.min[0]
const houseD = HOUSE_BOX.max[1] - HOUSE_BOX.min[1]
const WALL_H = 3.2

function House({ windowGlow }: { windowGlow: number }) {
  const [x, z] = houseCenter
  const front = HOUSE_BOX.max[1]
  return (
    <group>
      <mesh position={[x, WALL_H / 2, z]} castShadow receiveShadow>
        <boxGeometry args={[houseW, WALL_H, houseD]} />
        <meshStandardMaterial color="#b5523b" />
      </mesh>
      {/* mái ngói: lăng trụ tam giác */}
      <mesh position={[x, WALL_H + 1.3, z]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 1]} castShadow>
        <cylinderGeometry args={[houseD / 2 + 0.8, houseD / 2 + 0.8, houseW + 1.2, 3, 1]} />
        <meshStandardMaterial color="#a63a2a" />
      </mesh>
      {/* cửa và cửa sổ phát sáng buổi tối */}
      <mesh position={[x, 1.1, front + 0.02]}>
        <planeGeometry args={[1.4, 2.2]} />
        <meshStandardMaterial color="#5a3a22" />
      </mesh>
      {[-3.5, 3.5].map(dx => (
        <mesh key={dx} position={[x + dx, 1.7, front + 0.02]}>
          <planeGeometry args={[1.3, 1]} />
          <meshStandardMaterial color="#3b3326" emissive="#ffcf6b" emissiveIntensity={windowGlow * 1.6} />
        </mesh>
      ))}
      {/* sân phơi xi măng */}
      <mesh position={[x, 0.02, front + 3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[houseW + 4, 6]} />
        <meshStandardMaterial color="#b9b4a8" />
      </mesh>
    </group>
  )
}

function Palm({ position, tilt }: { position: [number, number]; tilt: number }) {
  return (
    <group position={[position[0], 0, position[1]]} rotation={[tilt, 0, tilt * 0.6]}>
      <mesh position={[0, 3, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.26, 6, 7]} />
        <meshStandardMaterial color="#8a6a45" />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <mesh key={i} position={[0, 6, 0]} rotation={[0.9, (i * Math.PI) / 3, 0]} castShadow>
          <boxGeometry args={[0.5, 0.06, 3]} />
          <meshStandardMaterial color="#3f8f3a" />
        </mesh>
      ))}
    </group>
  )
}

function Bamboo({ position }: { position: [number, number] }) {
  const stalks: [number, number, number][] = [[0, 0, 7], [0.5, 0.3, 6], [-0.4, 0.5, 6.5], [0.2, -0.5, 5.5], [-0.5, -0.3, 6.8]]
  return (
    <group position={[position[0], 0, position[1]]}>
      {stalks.map(([dx, dz, h], i) => (
        <mesh key={i} position={[dx, h / 2, dz]} rotation={[dz * 0.1, 0, dx * 0.1]} castShadow>
          <cylinderGeometry args={[0.07, 0.09, h, 6]} />
          <meshStandardMaterial color="#6f9d3c" />
        </mesh>
      ))}
    </group>
  )
}

function Haystack({ position }: { position: [number, number] }) {
  return (
    <mesh position={[position[0], 1.1, position[1]]} castShadow>
      <coneGeometry args={[1.4, 2.2, 10]} />
      <meshStandardMaterial color="#d8b860" />
    </mesh>
  )
}

const PALMS: [number, number][] = [
  [-28, -22], [-29, -12], [-27, -2], [-29, 8], [-28, 18], [-27, 28],
  [-14, 31], [-4, 32], [6, 31], [16, 32], [27, 30], [29, 20],
]
const BAMBOO: [number, number][] = [[-14, -36], [14, -35], [-32, 30]]
const HAYSTACKS: [number, number][] = [[10, -24], [13, -22]]

/** Nhà Địa chủ, sân phơi, Địa chủ NPC, dừa, tre, rơm, kênh nước (spec 7). */
export function Village({ windowGlow }: { windowGlow: number }) {
  const width = WORLD_BOUNDS.max[0] - WORLD_BOUNDS.min[0] + 40
  const depth = WORLD_BOUNDS.max[1] - WORLD_BOUNDS.min[1] + 40
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -7]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#7cae4f" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[CANAL.x, 0.01, (CANAL.zMin + CANAL.zMax) / 2]}>
        <planeGeometry args={[CANAL.width, CANAL.zMax - CANAL.zMin]} />
        <meshStandardMaterial color="#3f86b8" />
      </mesh>
      <House windowGlow={windowGlow} />
      <Person position={[HOUSE_DOOR[0], 0, HOUSE_DOOR[1]]} shirt="#7d2a2a" />
      {PALMS.map((p, i) => <Palm key={i} position={p} tilt={((i % 3) - 1) * 0.06} />)}
      {BAMBOO.map((p, i) => <Bamboo key={i} position={p} />)}
      {HAYSTACKS.map((p, i) => <Haystack key={i} position={p} />)}
    </group>
  )
}
