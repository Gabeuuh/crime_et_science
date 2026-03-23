import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";

/* ── Trace data ── */
const TRACES = [
  {
    position: [1.05, 0.9, 0.2] as [number, number, number],
    scale: 0.14,
    label: "Empreinte digitale",
  },
  {
    position: [0.6, 0.5, 0.85] as [number, number, number],
    scale: 0.11,
    label: "Empreinte digitale",
  },
  {
    position: [0.15, 1.78, 1.0] as [number, number, number],
    scale: 0.18,
    label: "Trace ADN (salive)",
  },
  {
    position: [-0.8, 0.7, 0.65] as [number, number, number],
    scale: 0.09,
    label: "Résidu cutané",
  },
];

const REVEAL_RADIUS = 0.5;
const GROUP_OFFSET = new THREE.Vector3(0, -0.9, 0);

/* ── UV spot that follows the pointer ── */
function UVSpot({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 1.0 + Math.sin(clock.getElapsedTime() * 5) * 0.3;
  });

  return (
    <group position={position}>
      <pointLight color="#8800ff" intensity={3} distance={2.5} />
      <mesh ref={ref}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial
          emissive="#aa55ff"
          emissiveIntensity={1}
          transparent
          opacity={0.7}
          color="#440088"
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[REVEAL_RADIUS * 0.6, 24, 24]} />
        <meshStandardMaterial
          emissive="#6600cc"
          emissiveIntensity={0.2}
          transparent
          opacity={0.06}
          color="#000000"
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

/* ── Glowing spot (revealed UV trace) ── */
function GlowSpot({
  position,
  scale,
  label,
}: {
  position: [number, number, number];
  scale: number;
  label: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const fadeRef = useRef(0);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    fadeRef.current = Math.min(fadeRef.current + 0.04, 1);
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.opacity = fadeRef.current * 0.85;
    mat.emissiveIntensity =
      fadeRef.current * (2.5 + Math.sin(clock.getElapsedTime() * 3) * 0.5);
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} renderOrder={10}>
        <sphereGeometry args={[scale, 16, 16]} />
        <meshStandardMaterial
          emissive="#00ff88"
          emissiveIntensity={0}
          transparent
          opacity={0}
          color="#003322"
          depthWrite={false}
        />
      </mesh>
      <mesh renderOrder={9}>
        <sphereGeometry args={[scale * 1.8, 16, 16]} />
        <meshStandardMaterial
          emissive="#00ff66"
          emissiveIntensity={0.8}
          transparent
          opacity={0.25}
          color="#000000"
          depthWrite={false}
        />
      </mesh>
      <Html position={[0, scale + 0.2, 0]} center>
        <div className="trace-label">{label}</div>
      </Html>
    </group>
  );
}


/* ── Coffee cup mesh ── */
function Cup({
  uvOn,
  onFoundCountChange,
}: {
  uvOn: boolean;
  onFoundCountChange: (count: number) => void;
}) {
  const cupMeshRef = useRef<THREE.Mesh>(null);
  const handleMeshRef = useRef<THREE.Mesh>(null);
  const [lightPos, setLightPos] = useState<[number, number, number] | null>(
    null
  );
  const [revealedTraces, setRevealedTraces] = useState<Set<number>>(new Set());

  const cupColor = uvOn ? "#1a0e2e" : "#f5f0e8";
  const coffeeColor = uvOn ? "#0a0515" : "#3c1f0a";

  const points = useMemo(
    () => [
      new THREE.Vector2(0.01, 0),
      new THREE.Vector2(0.85, 0),
      new THREE.Vector2(0.92, 0.08),
      new THREE.Vector2(0.95, 0.2),
      new THREE.Vector2(1.05, 0.9),
      new THREE.Vector2(1.12, 1.5),
      new THREE.Vector2(1.18, 1.8),
      new THREE.Vector2(1.2, 1.85),
      new THREE.Vector2(1.15, 1.85),
      new THREE.Vector2(1.13, 1.8),
      new THREE.Vector2(1.05, 1.5),
      new THREE.Vector2(0.98, 0.9),
      new THREE.Vector2(0.88, 0.2),
      new THREE.Vector2(0.01, 0.2),
    ],
    []
  );

  const handleCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(1.08, 1.45, 0),
        new THREE.Vector3(1.5, 1.35, 0),
        new THREE.Vector3(1.6, 0.95, 0),
        new THREE.Vector3(1.5, 0.55, 0),
        new THREE.Vector3(1.0, 0.45, 0),
      ]),
    []
  );

  useEffect(() => {
    if (!uvOn) setLightPos(null);
  }, [uvOn]);

  useEffect(() => {
    onFoundCountChange(revealedTraces.size);
  }, [revealedTraces.size, onFoundCountChange]);

  const handlePointer = useCallback(
    (e: any) => {
      if (!uvOn) return;
      e.stopPropagation();
      const wp = e.point;
      const localPoint: [number, number, number] = [
        wp.x - GROUP_OFFSET.x,
        wp.y - GROUP_OFFSET.y,
        wp.z - GROUP_OFFSET.z,
      ];
      setLightPos(localPoint);

      const pt = new THREE.Vector3(...localPoint);
      TRACES.forEach((trace, i) => {
        const tracePos = new THREE.Vector3(...trace.position);
        if (pt.distanceTo(tracePos) < REVEAL_RADIUS) {
          setRevealedTraces((prev) => {
            if (prev.has(i)) return prev;
            const next = new Set(prev);
            next.add(i);
            navigator.vibrate?.(80);
            return next;
          });
        }
      });
    },
    [uvOn]
  );

  const handlePointerOut = useCallback(() => {
    setLightPos(null);
  }, []);

  return (
    <group position={[0, -0.9, 0]}>
      {/* Cup body */}
      <mesh
        ref={cupMeshRef}
        onPointerDown={handlePointer as any}
        onPointerMove={handlePointer as any}
        onPointerUp={handlePointerOut}
        onPointerLeave={handlePointerOut}
      >
        <latheGeometry args={[points, 48]} />
        <meshStandardMaterial
          color={cupColor}
          side={THREE.DoubleSide}
          roughness={0.35}
          metalness={0.05}
        />
      </mesh>

      {/* Handle */}
      <mesh
        ref={handleMeshRef}
        onPointerDown={handlePointer as any}
        onPointerMove={handlePointer as any}
        onPointerUp={handlePointerOut}
        onPointerLeave={handlePointerOut}
      >
        <tubeGeometry args={[handleCurve, 24, 0.07, 12, false]} />
        <meshStandardMaterial
          color={cupColor}
          roughness={0.35}
          metalness={0.05}
        />
      </mesh>

      {/* Coffee surface */}
      <mesh position={[0, 1.65, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.95, 48]} />
        <meshStandardMaterial color={coffeeColor} roughness={0.8} />
      </mesh>

      {/* UV light spot */}
      {uvOn && lightPos && <UVSpot position={lightPos} />}

      {/* Revealed traces */}
      {uvOn &&
        TRACES.map(
          (trace, i) =>
            revealedTraces.has(i) && (
              <GlowSpot
                key={i}
                position={trace.position}
                scale={trace.scale}
                label={trace.label}
              />
            )
        )}
    </group>
  );
}

/* ── Main analysis view ── */
interface Props {
  onBack: () => void;
}

export default function AnalysisView({ onBack }: Props) {
  const [uvOn, setUvOn] = useState(false);
  const [foundCount, setFoundCount] = useState(0);
  const allFound = foundCount === TRACES.length;

  return (
    <div className="analysis-view">
      <header className="analysis-header">
        <button className="back-btn" onClick={onBack}>
          ← Retour
        </button>
        <h2>🔬 Analyse de l'indice</h2>
        <span className="evidence-tag">☕ TASSE DE CAFÉ</span>
      </header>

      <div className="canvas-container">
        <Canvas camera={{ position: [3, 2, 3], fov: 45 }}>
          <color attach="background" args={[uvOn ? "#08001a" : "#1a1a2e"]} />

          <ambientLight
            intensity={uvOn ? 0.04 : 0.5}
            color={uvOn ? "#220044" : "#ffffff"}
          />
          <directionalLight
            position={[5, 5, 5]}
            intensity={uvOn ? 0.03 : 0.7}
          />
          <directionalLight
            position={[-3, 2, -2]}
            intensity={uvOn ? 0.01 : 0.3}
          />

          <Cup uvOn={uvOn} onFoundCountChange={setFoundCount} />

          <gridHelper
            args={[
              8,
              16,
              uvOn ? "#1a0033" : "#2a2a4a",
              uvOn ? "#0d001a" : "#1e1e3a",
            ]}
            position={[0, -0.92, 0]}
          />

          {/* Disable OrbitControls in UV mode so touch goes to raycaster */}
          <OrbitControls
            enablePan={false}
            minDistance={2.5}
            maxDistance={7}
            autoRotate={!uvOn}
            autoRotateSpeed={1.5}
            enabled={!uvOn}
          />
        </Canvas>
      </div>

      <div className="tools-bar">
        <button
          className={`tool-btn ${uvOn ? "active" : ""}`}
          onClick={() => setUvOn(!uvOn)}
        >
          <span className="tool-icon">🔦</span>
          <span>Lampe UV</span>
        </button>

        {uvOn && (
          <div className="trace-counter">
            {foundCount}/{TRACES.length} traces
          </div>
        )}
      </div>

      {uvOn && !allFound && (
        <div className="uv-indicator">
          <span className="uv-dot" />
          {foundCount === 0
            ? "Balayez la tasse avec le doigt"
            : `${foundCount}/${TRACES.length} traces biologiques détectées`}
        </div>
      )}

      {uvOn && allFound && (
        <div className="all-found-banner">
          🏆 Toutes les traces ont été relevées !
        </div>
      )}

      {!uvOn && (
        <div className="instructions">
          Faites glisser pour tourner • Activez la lampe UV pour révéler les
          traces
        </div>
      )}
    </div>
  );
}
