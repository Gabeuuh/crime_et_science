import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";

/* ── Trace data ── */
type ToolType = "uv" | "ir";

interface Trace {
  position: [number, number, number];
  scale: number;
  label: string;
  tool: ToolType;
  reportLabel: string;
  reportValue: string;
}

const TRACES: Trace[] = [
  {
    position: [0.0, 0.02, 0.15],
    scale: 0.18,
    label: "Filigrane altéré",
    tool: "uv",
    reportLabel: "Filigrane de sécurité",
    reportValue: "Filigrane partiellement effacé par solvant chimique — motif RF non conforme au standard ISO 7501",
  },
  {
    position: [-0.5, 0.02, -0.3],
    scale: 0.14,
    label: "Traces de colle",
    tool: "uv",
    reportLabel: "Zone photo d'identité",
    reportValue: "Fluorescence résiduelle de colle cyanoacrylate — photo recollée après substitution",
  },
  {
    position: [0.5, 0.02, 0.0],
    scale: 0.12,
    label: "Encre différente",
    tool: "ir",
    reportLabel: "Date de naissance",
    reportValue: "Encre à base de colorant (visible IR) différente de l'encre d'origine à base de pigment — date modifiée",
  },
  {
    position: [0.45, 0.02, -0.55],
    scale: 0.15,
    label: "Tampon contrefait",
    tool: "ir",
    reportLabel: "Tampon d'entrée Schengen",
    reportValue: "Absorption IR incohérente — encre jet d'encre domestique, non tampographie officielle",
  },
];

const REVEAL_RADIUS = 0.35;
const SCAN_MIN_DIST = 0.08;
const SCAN_MAX_POINTS = 600;

/* ── Light spot (UV or IR) ── */
function LightSpot({ position, tool }: { position: [number, number, number]; tool: ToolType }) {
  const ref = useRef<THREE.Mesh>(null);
  const color = tool === "uv" ? "#8800ff" : "#ff2200";
  const emissive = tool === "uv" ? "#aa55ff" : "#ff4422";

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 1.0 + Math.sin(clock.getElapsedTime() * 5) * 0.3;
  });

  return (
    <group position={position}>
      <pointLight color={color} intensity={3} distance={2} />
      <mesh ref={ref}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial emissive={emissive} emissiveIntensity={1} transparent opacity={0.7} color={color} />
      </mesh>
      <mesh>
        <sphereGeometry args={[REVEAL_RADIUS * 0.5, 24, 24]} />
        <meshStandardMaterial emissive={color} emissiveIntensity={0.15} transparent opacity={0.06} color="#000000" side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

/* ── Glow spot for revealed traces ── */
function GlowSpot({ position, scale, label, tool }: { position: [number, number, number]; scale: number; label: string; tool: ToolType }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const fadeRef = useRef(0);
  const glowColor = tool === "uv" ? "#00ff88" : "#ff8800";
  const outerGlow = tool === "uv" ? "#00ff66" : "#ff6600";

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    fadeRef.current = Math.min(fadeRef.current + 0.04, 1);
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.opacity = fadeRef.current * 0.85;
    mat.emissiveIntensity = fadeRef.current * (2.5 + Math.sin(clock.getElapsedTime() * 3) * 0.5);
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} renderOrder={10}>
        <sphereGeometry args={[scale, 16, 16]} />
        <meshStandardMaterial emissive={glowColor} emissiveIntensity={0} transparent opacity={0} color="#003322" depthWrite={false} />
      </mesh>
      <mesh renderOrder={9}>
        <sphereGeometry args={[scale * 1.8, 16, 16]} />
        <meshStandardMaterial emissive={outerGlow} emissiveIntensity={0.8} transparent opacity={0.25} color="#000000" depthWrite={false} />
      </mesh>
      {label && (
        <Html position={[0, scale + 0.15, 0]} center>
          <div className="trace-label">{label}</div>
        </Html>
      )}
    </group>
  );
}

/* ── Scan trail ── */
function ScanTrail({ pointsRef, tool }: { pointsRef: React.RefObject<[number, number, number][]>; tool: ToolType }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lastCount = useRef(0);
  const trailColor = tool === "uv" ? "#7733dd" : "#dd3322";

  useFrame(() => {
    if (!meshRef.current || !pointsRef.current) return;
    const pts = pointsRef.current;
    if (pts.length === lastCount.current) return;
    for (let i = lastCount.current; i < pts.length; i++) {
      const [x, y, z] = pts[i];
      dummy.position.set(x, y + 0.01, z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.count = pts.length;
    meshRef.current.instanceMatrix.needsUpdate = true;
    lastCount.current = pts.length;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, SCAN_MAX_POINTS]} renderOrder={5}>
      <circleGeometry args={[0.08, 12]} />
      <meshStandardMaterial emissive={trailColor} emissiveIntensity={0.7} transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
    </instancedMesh>
  );
}

/* ── 3D Passport model ── */
function Passport({
  activeTool,
  onFoundCountChange,
  hideLabels,
}: {
  activeTool: ToolType | null;
  onFoundCountChange: (count: number) => void;
  hideLabels: boolean;
}) {
  const [lightPos, setLightPos] = useState<[number, number, number] | null>(null);
  const [revealedTraces, setRevealedTraces] = useState<Set<number>>(new Set());
  const scanPointsRef = useRef<[number, number, number][]>([]);

  const toolOn = activeTool !== null;

  const coverColor = toolOn ? (activeTool === "uv" ? "#1a0e2e" : "#1a0505") : "#1a3a5a";
  const pageColor = toolOn ? (activeTool === "uv" ? "#0d0520" : "#0d0505") : "#f5f0e0";

  useEffect(() => {
    if (!toolOn) {
      setLightPos(null);
      scanPointsRef.current = [];
    }
  }, [toolOn]);

  useEffect(() => {
    onFoundCountChange(revealedTraces.size);
  }, [revealedTraces.size, onFoundCountChange]);

  const handlePointer = useCallback(
    (e: any) => {
      if (!activeTool) return;
      e.stopPropagation();
      const wp = e.point;
      const localPoint: [number, number, number] = [wp.x, wp.y, wp.z];
      setLightPos(localPoint);

      const pts = scanPointsRef.current;
      const last = pts[pts.length - 1];
      const lp = new THREE.Vector3(...localPoint);
      if (pts.length < SCAN_MAX_POINTS && (!last || lp.distanceTo(new THREE.Vector3(...last)) > SCAN_MIN_DIST)) {
        pts.push(localPoint);
      }

      TRACES.forEach((trace, i) => {
        if (trace.tool !== activeTool) return;
        const tracePos = new THREE.Vector3(...trace.position);
        if (lp.distanceTo(tracePos) < REVEAL_RADIUS) {
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
    [activeTool]
  );

  const handlePointerOut = useCallback(() => setLightPos(null), []);

  const pointerProps = toolOn
    ? { onPointerDown: handlePointer, onPointerMove: handlePointer, onPointerUp: handlePointerOut, onPointerLeave: handlePointerOut }
    : {};

  return (
    <group>
      {/* Passport cover (bottom) */}
      <mesh position={[0, -0.04, 0]} {...pointerProps}>
        <boxGeometry args={[1.5, 0.04, 1.1]} />
        <meshStandardMaterial color={coverColor} roughness={0.4} metalness={0.1} />
      </mesh>
      {/* Pages */}
      <mesh position={[0, 0.0, 0]} {...pointerProps}>
        <boxGeometry args={[1.4, 0.05, 1.0]} />
        <meshStandardMaterial color={pageColor} roughness={0.8} />
      </mesh>
      {/* Cover top (open) */}
      <mesh position={[-0.85, 0.15, 0]} rotation={[0, 0, Math.PI / 4]} {...pointerProps}>
        <boxGeometry args={[1.5, 0.04, 1.1]} />
        <meshStandardMaterial color={coverColor} roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Photo placeholder */}
      <mesh position={[-0.5, 0.026, -0.25]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.35, 0.45]} />
        <meshStandardMaterial color={toolOn ? "#111" : "#ccbbaa"} roughness={0.9} />
      </mesh>

      {/* Text lines on page */}
      {[0.2, 0.1, 0.0, -0.1, -0.2].map((z, i) => (
        <mesh key={i} position={[0.2, 0.026, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.6, 0.03]} />
          <meshStandardMaterial color={toolOn ? "#111" : "#999"} roughness={0.9} />
        </mesh>
      ))}

      {/* Stamp circle */}
      <mesh position={[0.45, 0.026, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.13, 32]} />
        <meshStandardMaterial color={toolOn ? "#111" : "#cc4444"} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* Scan trail */}
      {toolOn && activeTool && <ScanTrail pointsRef={scanPointsRef} tool={activeTool} />}

      {/* Light spot */}
      {toolOn && lightPos && activeTool && <LightSpot position={lightPos} tool={activeTool} />}

      {/* Revealed traces */}
      {toolOn &&
        TRACES.map(
          (trace, i) =>
            revealedTraces.has(i) && (
              <GlowSpot key={i} position={trace.position} scale={trace.scale} label={hideLabels ? "" : trace.label} tool={trace.tool} />
            )
        )}
    </group>
  );
}

/* ── Main view ── */
export default function PasseportAnalysis({ onBack }: { onBack: () => void }) {
  const [activeTool, setActiveTool] = useState<ToolType | null>(null);
  const [foundCount, setFoundCount] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const allFound = foundCount === TRACES.length;

  useEffect(() => {
    if (allFound && activeTool) {
      const timer = setTimeout(() => setShowReport(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [allFound, activeTool]);

  const toolOn = activeTool !== null;
  const bgColor = activeTool === "uv" ? "#05091a" : activeTool === "ir" ? "#1a0505" : "#0e1525";

  return (
    <div className="analysis-view">
      <header className="analysis-header">
        <button className="back-btn" onClick={onBack}>← RETOUR</button>
        <div className="header-center">
          <span className="header-dept">POLICE SCIENTIFIQUE</span>
          <span className="header-case">Affaire #2024-0847</span>
        </div>
        <span className="evidence-tag">PIECE A CONV. — PASSEPORT</span>
      </header>

      <div className="canvas-container">
        <Canvas camera={{ position: [0, 2.5, 1.5], fov: 40 }}>
          <color attach="background" args={[bgColor]} />
          <ambientLight intensity={toolOn ? 0.04 : 0.5} color={activeTool === "ir" ? "#440000" : activeTool === "uv" ? "#220044" : "#ffffff"} />
          <directionalLight position={[5, 5, 5]} intensity={toolOn ? 0.03 : 0.7} />
          <directionalLight position={[-3, 2, -2]} intensity={toolOn ? 0.01 : 0.3} />

          <Passport activeTool={activeTool} onFoundCountChange={setFoundCount} hideLabels={showReport} />

          <gridHelper args={[8, 16, toolOn ? "#1a0033" : "#1a2540", toolOn ? "#0d001a" : "#111c30"]} position={[0, -0.07, 0]} />
          <OrbitControls enablePan={false} minDistance={2} maxDistance={5} autoRotate={!toolOn} autoRotateSpeed={1.5} enabled={!toolOn} />
        </Canvas>
      </div>

      <div className="tools-bar">
        <button className={`tool-btn ${activeTool === "uv" ? "active" : ""}`} onClick={() => setActiveTool(activeTool === "uv" ? null : "uv")}>
          <span className="tool-icon">{activeTool === "uv" ? "◉" : "◎"}</span>
          <span>UV</span>
        </button>
        <button className={`tool-btn ir ${activeTool === "ir" ? "active" : ""}`} onClick={() => setActiveTool(activeTool === "ir" ? null : "ir")}>
          <span className="tool-icon">{activeTool === "ir" ? "◉" : "◎"}</span>
          <span>INFRAROUGE</span>
        </button>
        {toolOn && (
          <div className="trace-counter">
            <span className="counter-label">INDICES</span>
            <span className="counter-value">{foundCount}/{TRACES.length}</span>
          </div>
        )}
      </div>

      {toolOn && !allFound && (
        <div className="uv-indicator" style={activeTool === "ir" ? { borderLeftColor: "#ef4444" } : undefined}>
          <span className="uv-dot" style={activeTool === "ir" ? { background: "#ef4444", boxShadow: "0 0 6px #ef4444" } : undefined} />
          {foundCount === 0
            ? `MODE ${activeTool === "uv" ? "ULTRAVIOLET" : "INFRAROUGE"} — BALAYEZ LE DOCUMENT`
            : `${foundCount}/${TRACES.length} ANOMALIES DETECTEES`}
        </div>
      )}

      {!toolOn && !showReport && (
        <div className="instructions">ACTIVEZ UV OU INFRAROUGE POUR ANALYSER LE DOCUMENT</div>
      )}

      {showReport && (
        <div className="report-overlay">
          <div className="report-card">
            <div className="report-stripe" />
            <div className="report-header">
              <div className="report-badge-row">
                <span className="report-badge">CONFIDENTIEL</span>
                <span className="report-badge report-badge-blue">LABO. DOCUMENTS & TRACES</span>
              </div>
              <h3>RAPPORT D'ANALYSE</h3>
              <div className="report-meta">
                <span>Ref. DOC-2024-0847</span>
                <span>Piece : Passeport suspect</span>
              </div>
            </div>
            <div className="report-body">
              {TRACES.map((trace, i) => (
                <div key={i} className="report-row">
                  <div className="report-row-num">{String(i + 1).padStart(2, "0")}</div>
                  <div className="report-row-content">
                    <span className="report-row-label">{trace.reportLabel}</span>
                    <span className="report-row-value">{trace.reportValue}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="report-footer">
              <p className="report-instruction">CONCLUSION : DOCUMENT FALSIFIE — IDENTITE USURPEE</p>
              <button className="report-close-btn" onClick={() => setShowReport(false)}>FERMER LE RAPPORT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
