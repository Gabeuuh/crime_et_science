import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";

/* ── Hidden text impressions (ESDA reveals indentations) ── */
const TRACES = [
  {
    position: [0.0, 0.016, 0.55] as [number, number, number],
    size: [1.0, 0.12] as [number, number],
    label: "Ligne d'écriture",
    text: "RDV 22h — laboratoire",
    reportLabel: "Indentation ligne 1",
    reportValue: "\"RDV 22h — laboratoire\" — pression stylo bille forte, écriture rapide",
  },
  {
    position: [0.0, 0.016, 0.2] as [number, number, number],
    size: [0.8, 0.12] as [number, number],
    label: "Ligne d'écriture",
    text: "augmenter dose ×2",
    reportLabel: "Indentation ligne 2",
    reportValue: "\"augmenter dose ×2\" — même stylo, traits appuyés sur le ×2",
  },
  {
    position: [0.0, 0.016, -0.15] as [number, number, number],
    size: [0.7, 0.12] as [number, number],
    label: "Ligne d'écriture",
    text: "ne rien dire à M.",
    reportLabel: "Indentation ligne 3",
    reportValue: "\"ne rien dire à M.\" — pression réduite, écriture hésitante",
  },
  {
    position: [0.0, 0.016, -0.55] as [number, number, number],
    size: [0.9, 0.12] as [number, number],
    label: "Ligne d'écriture",
    text: "clé cachée sous pot fleurs",
    reportLabel: "Indentation ligne 4",
    reportValue: "\"clé cachée sous pot fleurs\" — tracé ferme, souligné deux fois",
  },
];

const REVEAL_RADIUS = 0.3;
const SCAN_MIN_DIST = 0.06;
const SCAN_MAX_POINTS = 800;

/* ── Electrostatic charge particles ── */
function ChargeParticles({ pointsRef }: { pointsRef: React.RefObject<[number, number, number][]> }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lastCount = useRef(0);

  useFrame(() => {
    if (!meshRef.current || !pointsRef.current) return;
    const pts = pointsRef.current;
    if (pts.length === lastCount.current) return;
    for (let i = lastCount.current; i < pts.length; i++) {
      const [x, y, z] = pts[i];
      dummy.position.set(x, y + 0.005, z);
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
      <circleGeometry args={[0.04, 8]} />
      <meshStandardMaterial emissive="#4488ff" emissiveIntensity={0.8} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
    </instancedMesh>
  );
}

/* ── ESDA electrode spot ── */
function ElectrodeSpot({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.8 + Math.sin(clock.getElapsedTime() * 8) * 0.4;
  });

  return (
    <group position={position}>
      <pointLight color="#4488ff" intensity={2} distance={1.5} />
      <mesh ref={ref}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial emissive="#4488ff" emissiveIntensity={1} transparent opacity={0.7} color="#224488" />
      </mesh>
      <mesh>
        <sphereGeometry args={[REVEAL_RADIUS * 0.5, 24, 24]} />
        <meshStandardMaterial emissive="#2244aa" emissiveIntensity={0.15} transparent opacity={0.06} color="#000000" side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

/* ── Revealed text impression ── */
function RevealedText({ position, text }: { position: [number, number, number]; text: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const fadeRef = useRef(0);

  useFrame(() => {
    if (!meshRef.current) return;
    fadeRef.current = Math.min(fadeRef.current + 0.03, 1);
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.opacity = fadeRef.current * 0.6;
    mat.emissiveIntensity = fadeRef.current * 1.5;
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} renderOrder={10}>
        <planeGeometry args={[1.2, 0.08]} />
        <meshStandardMaterial emissive="#66aaff" emissiveIntensity={0} transparent opacity={0} color="#112244" depthWrite={false} />
      </mesh>
      <Html position={[0, 0.05, 0]} center>
        <div className="esda-text">{text}</div>
      </Html>
    </group>
  );
}

/* ── 3D Notebook page ── */
function NotebookPage({
  esdaOn,
  onFoundCountChange,
  hideLabels,
}: {
  esdaOn: boolean;
  onFoundCountChange: (count: number) => void;
  hideLabels: boolean;
}) {
  const [lightPos, setLightPos] = useState<[number, number, number] | null>(null);
  const [revealedTraces, setRevealedTraces] = useState<Set<number>>(new Set());
  const scanPointsRef = useRef<[number, number, number][]>([]);

  useEffect(() => {
    if (!esdaOn) {
      setLightPos(null);
      scanPointsRef.current = [];
    }
  }, [esdaOn]);

  useEffect(() => {
    onFoundCountChange(revealedTraces.size);
  }, [revealedTraces.size, onFoundCountChange]);

  const handlePointer = useCallback(
    (e: any) => {
      if (!esdaOn) return;
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
    [esdaOn]
  );

  const handlePointerOut = useCallback(() => setLightPos(null), []);

  const pointerProps = esdaOn
    ? { onPointerDown: handlePointer, onPointerMove: handlePointer, onPointerUp: handlePointerOut, onPointerLeave: handlePointerOut }
    : {};

  const pageColor = esdaOn ? "#0a0e1a" : "#f5f0e0";

  return (
    <group>
      {/* Page paper */}
      <mesh position={[0, 0, 0]} {...pointerProps}>
        <boxGeometry args={[1.6, 0.02, 1.8]} />
        <meshStandardMaterial color={pageColor} roughness={0.9} />
      </mesh>

      {/* Page lines (visible when not in ESDA mode) */}
      {!esdaOn &&
        [-0.7, -0.5, -0.3, -0.1, 0.1, 0.3, 0.5, 0.7].map((z, i) => (
          <mesh key={i} position={[0, 0.011, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.4, 0.005]} />
            <meshStandardMaterial color="#c8c0b0" roughness={0.9} />
          </mesh>
        ))}

      {/* Spiral binding */}
      {[-0.8, -0.5, -0.2, 0.1, 0.4, 0.7].map((z, i) => (
        <mesh key={i} position={[-0.85, 0.02, z]}>
          <torusGeometry args={[0.04, 0.008, 8, 16, Math.PI]} />
          <meshStandardMaterial color={esdaOn ? "#111" : "#888"} metalness={0.8} roughness={0.3} />
        </mesh>
      ))}

      {/* Torn edge (top) */}
      <mesh position={[0, 0.011, 0.92]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.6, 0.02]} />
        <meshStandardMaterial color={esdaOn ? "#0a0e1a" : "#e8e0d0"} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* ESDA charge particles */}
      {esdaOn && <ChargeParticles pointsRef={scanPointsRef} />}

      {/* Electrode spot */}
      {esdaOn && lightPos && <ElectrodeSpot position={lightPos} />}

      {/* Revealed text impressions */}
      {esdaOn &&
        TRACES.map(
          (trace, i) =>
            revealedTraces.has(i) && (
              <RevealedText key={i} position={trace.position} text={hideLabels ? "" : trace.text} />
            )
        )}
    </group>
  );
}

/* ── Main view ── */
export default function CarnetAnalysis({ onBack }: { onBack: () => void }) {
  const [esdaOn, setEsdaOn] = useState(false);
  const [foundCount, setFoundCount] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const allFound = foundCount === TRACES.length;

  useEffect(() => {
    if (allFound && esdaOn) {
      const timer = setTimeout(() => setShowReport(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [allFound, esdaOn]);

  return (
    <div className="analysis-view">
      <header className="analysis-header">
        <button className="back-btn" onClick={onBack}>← RETOUR</button>
        <div className="header-center">
          <span className="header-dept">POLICE SCIENTIFIQUE</span>
          <span className="header-case">Affaire #2024-0847</span>
        </div>
        <span className="evidence-tag">PIECE A CONV. — CARNET</span>
      </header>

      <div className="canvas-container">
        <Canvas camera={{ position: [0, 2.5, 1.2], fov: 40 }}>
          <color attach="background" args={[esdaOn ? "#050a1a" : "#0e1525"]} />
          <ambientLight intensity={esdaOn ? 0.06 : 0.5} color={esdaOn ? "#112244" : "#ffffff"} />
          <directionalLight position={[5, 5, 5]} intensity={esdaOn ? 0.05 : 0.7} />
          <directionalLight position={[-3, 2, -2]} intensity={esdaOn ? 0.02 : 0.3} />

          <NotebookPage esdaOn={esdaOn} onFoundCountChange={setFoundCount} hideLabels={showReport} />

          <gridHelper args={[8, 16, esdaOn ? "#0a1133" : "#1a2540", esdaOn ? "#050a1a" : "#111c30"]} position={[0, -0.02, 0]} />
          <OrbitControls enablePan={false} minDistance={2} maxDistance={5} autoRotate={!esdaOn} autoRotateSpeed={1.5} enabled={!esdaOn} />
        </Canvas>
      </div>

      <div className="tools-bar">
        <button className={`tool-btn esda ${esdaOn ? "active" : ""}`} onClick={() => setEsdaOn(!esdaOn)}>
          <span className="tool-icon">{esdaOn ? "⚡" : "◎"}</span>
          <span>ESDA</span>
        </button>
        {esdaOn && (
          <div className="trace-counter">
            <span className="counter-label">LIGNES</span>
            <span className="counter-value">{foundCount}/{TRACES.length}</span>
          </div>
        )}
      </div>

      {esdaOn && !allFound && (
        <div className="uv-indicator" style={{ borderLeftColor: "#3b82f6" }}>
          <span className="uv-dot" style={{ background: "#3b82f6", boxShadow: "0 0 6px #3b82f6" }} />
          {foundCount === 0
            ? "CHARGEZ LA SURFACE — BALAYEZ AVEC LE DOIGT"
            : `${foundCount}/${TRACES.length} INDENTATIONS REVELEES`}
        </div>
      )}

      {!esdaOn && !showReport && (
        <div className="instructions">ACTIVEZ L'ESDA POUR REVELER LES INDENTATIONS D'ECRITURE</div>
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
              <h3>RAPPORT ESDA</h3>
              <div className="report-meta">
                <span>Ref. ESDA-2024-0847</span>
                <span>Piece : Page arrachee carnet</span>
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
              <p className="report-instruction">CONCLUSION : MESSAGE PLANIFIANT UNE ACTION SUSPECTE</p>
              <button className="report-close-btn" onClick={() => setShowReport(false)}>FERMER LE RAPPORT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
