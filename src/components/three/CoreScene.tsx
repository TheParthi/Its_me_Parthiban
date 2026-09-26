import { Canvas, useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

// "Computational core": a faceted metallic kernel inside a holographic
// fresnel shell, wrapped by a wireframe lattice and orbiting data rings.

const fresnelVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`
const fresnelFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uA;
  uniform vec3 uB;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float f = pow(1.0 - abs(dot(vNormal, vView)), 2.6);
    float band = 0.5 + 0.5 * sin(vNormal.y * 14.0 + uTime * 1.4);
    vec3 col = mix(uA, uB, band);
    gl_FragColor = vec4(col, f * 0.85);
  }
`

function Shell() {
  const mat = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uA: { value: new THREE.Color('#8B5CF6') },
      uB: { value: new THREE.Color('#00E5FF') },
    }),
    [],
  )
  useFrame((_, dt) => {
    if (mat.current) mat.current.uniforms.uTime.value += dt
  })
  return (
    <mesh scale={1.55}>
      <icosahedronGeometry args={[1, 6]} />
      <shaderMaterial
        ref={mat}
        vertexShader={fresnelVertex}
        fragmentShader={fresnelFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

function Kernel() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (!ref.current) return
    ref.current.rotation.x += dt * 0.25
    ref.current.rotation.y += dt * 0.35
  })
  return (
    <mesh ref={ref} scale={0.78}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#3a3f58" emissive="#1b1040" metalness={0.65} roughness={0.28} flatShading />
    </mesh>
  )
}

function Lattice() {
  const ref = useRef<THREE.LineSegments>(null)
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.9, 1)), [])
  useFrame((_, dt) => {
    if (!ref.current) return
    ref.current.rotation.y -= dt * 0.08
    ref.current.rotation.z += dt * 0.04
  })
  return (
    <lineSegments ref={ref} geometry={geo}>
      <lineBasicMaterial color="#8B5CF6" transparent opacity={0.28} />
    </lineSegments>
  )
}

function Ring({ radius, tilt, speed, color, dots }: { radius: number; tilt: [number, number, number]; speed: number; color: string; dots: number }) {
  const ref = useRef<THREE.Group>(null)
  const points = useMemo(() => {
    const arr = new Float32Array(dots * 3)
    for (let i = 0; i < dots; i++) {
      const a = (i / dots) * Math.PI * 2
      arr[i * 3] = Math.cos(a) * radius
      arr[i * 3 + 2] = Math.sin(a) * radius
    }
    return arr
  }, [radius, dots])
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * speed
  })
  return (
    <group rotation={tilt}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.004, 8, 160]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} />
      </mesh>
      <group ref={ref}>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[points, 3]} />
          </bufferGeometry>
          <pointsMaterial color={color} size={0.045} sizeAttenuation transparent opacity={0.9} />
        </points>
        {/* A single brighter "packet" riding the ring. */}
        <mesh position={[radius, 0, 0]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
    </group>
  )
}

function Particles({ count = 900 }) {
  const ref = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 2.6 + Math.random() * 3.2
      const t = Math.random() * Math.PI * 2
      const p = Math.acos(2 * Math.random() - 1)
      arr[i * 3] = r * Math.sin(p) * Math.cos(t)
      arr[i * 3 + 1] = r * Math.sin(p) * Math.sin(t)
      arr[i * 3 + 2] = r * Math.cos(p)
    }
    return arr
  }, [count])
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.02
  })
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#9aa0ff" size={0.018} sizeAttenuation transparent opacity={0.55} depthWrite={false} />
    </points>
  )
}

/** Eases the whole rig towards the pointer for a subtle parallax tilt. */
function Rig({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ pointer }, dt) => {
    if (!ref.current) return
    const k = 1 - Math.pow(0.001, dt)
    ref.current.rotation.y += (pointer.x * 0.5 - ref.current.rotation.y) * k
    ref.current.rotation.x += (-pointer.y * 0.35 - ref.current.rotation.x) * k
  })
  return <group ref={ref}>{children}</group>
}

export default function CoreScene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 6.2], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      eventSource={document.body}
      eventPrefix="client"
    >
      <ambientLight intensity={0.25} />
      <pointLight position={[4, 3, 4]} intensity={60} color="#00E5FF" />
      <pointLight position={[-4, -2, 3]} intensity={60} color="#8B5CF6" />
      <pointLight position={[0, 4, -4]} intensity={30} color="#ffffff" />
      <Rig>
        <Float speed={1.2} rotationIntensity={0.25} floatIntensity={0.6}>
          <Kernel />
          <Shell />
          <Lattice />
          <Ring radius={2.35} tilt={[0.35, 0, 0.2]} speed={0.35} color="#00E5FF" dots={64} />
          <Ring radius={2.7} tilt={[-0.6, 0.3, -0.1]} speed={-0.22} color="#8B5CF6" dots={90} />
        </Float>
        <Particles />
      </Rig>
    </Canvas>
  )
}
