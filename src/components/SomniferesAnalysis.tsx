import { useState, useRef, useCallback, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";

/* ── Pills data — Marquis reagent test results ── */
interface Pill {
  position: [number, number, number];
  originalColor: string;
  reagentColor: string;
  substance: string;
  label: string;
  reportLabel: string;
  reportValue: string;
}

const PILLS: Pill[] = [
  {
    position: [-0.5, 0.1, 0.4],
    originalColor: "#e8e0d0",
    reagentColor: "#6b21a8",
    substance: "Benzodiazépine",
    label: "Violet → Benzodiazépine",
    reportLabel: "Comprimé #1 — Test de Marquis",
    reportValue: "Réaction violette/pourpre — Benzodiazépine détectée (non conforme à l'étiquetage \"somnifère naturel\")",
  },
  {
    position: [0.3, 0.1, 0.5],
    originalColor: "#e8e0d0",
    reagentColor: "#ea580c",
    substance: "Amphétamine",
    label: "Orange → Amphétamine",
    reportLabel: "Comprimé #2 — Test de Marquis",
    reportValue: "Réaction orange vif — Amphétamine/MDMA détectée. Substance incompatible avec un somnifère",
  },
  {
    position: [0.6, 0.1, -0.1],
    originalColor: "#e8e0d0",
    reagentColor: "#e8e0d0",
    substance: "Placebo",
    label: "Aucune réaction → Placebo",
    reportLabel: "Comprimé #3 — Test de Marquis",
    reportValue: "Aucune réaction colorimétrique — substance inerte (lactose/amidon). Comprimé placebo",
  },
  {
    position: [-0.4, 0.1, -0.3],
    originalColor: "#e8e0d0",
    reagentColor: "#1d4ed8",
    substance: "Opioïde",
    label: "Bleu → Opioïde",
    reportLabel: "Comprimé #4 — Test de Marquis",
    reportValue: "Réaction bleu foncé — Opioïde de synthèse (type fentanyl). Substance contrôlée, hautement dangereuse",
  },
];

/* ── Animated pill that reacts to reagent ── */
function PillMesh({
  pill,
  index,
  pipetteOn,
  tested,
  onTest,
}: {
  pill: Pill;
  index: number;
  pipetteOn: boolean;
  tested: boolean;
  onTest: (index: number) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const colorRef = useRef(new THREE.Color(pill.originalColor));
  const targetColor = useRef(new THREE.Color(pill.originalColor));
  const bubblesRef = useRef<THREE.Mesh>(null);
  const [showBubbles, setShowBubbles] = useState(false);

  useEffect(() => {
    if (tested) {
      targetColor.current.set(pill.reagentColor);
      setShowBubbles(true);
      const timer = setTimeout(() => setShowBubbles(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [tested, pill.reagentColor]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    colorRef.current.lerp(targetColor.current, 0.05);
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.color.copy(colorRef.current);

    if (bubblesRef.current) {
      const bMat = bubblesRef.current.material as THREE.MeshStandardMaterial;
      bMat.opacity = Math.max(0, 0.5 - (clock.getElapsedTime() % 2) * 0.3);
      bubblesRef.current.scale.setScalar(1 + Math.sin(clock.getElapsedTime() * 4) * 0.1);
    }
  });

  const handleClick = useCallback(
    (e: any) => {
      if (!pipetteOn || tested) return;
      e.stopPropagation();
      onTest(index);
      navigator.vibrate?.(80);
    },
    [pipetteOn, tested, onTest, index]
  );

  return (
    <group position={pill.position}>
      {/* Pill - capsule shape (two hemispheres + cylinder) */}
      <mesh ref={meshRef} onClick={handleClick} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.08, 0.12, 8, 16]} />
        <meshStandardMaterial color={pill.originalColor} roughness={0.4} metalness={0.05} />
      </mesh>

      {/* Reaction bubbles */}
      {showBubbles && (
        <mesh ref={bubblesRef} position={[0, 0.15, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial emissive={pill.reagentColor} emissiveIntensity={2} transparent opacity={0.5} color={pill.reagentColor} depthWrite={false} />
        </mesh>
      )}

      {/* Label after test */}
      {tested && (
        <Html position={[0, 0.3, 0]} center>
          <div className="trace-label" style={{
            borderColor: pill.reagentColor === "#e8e0d0" ? "#888" : pill.reagentColor,
            color: pill.reagentColor === "#e8e0d0" ? "#888" : pill.reagentColor,
          }}>
            {pill.label}
          </div>
        </Html>
      )}
    </group>
  );
}

/* ── Pill bottle ── */
function PillBottle({ pipetteOn }: { pipetteOn: boolean }) {
  const bottleColor = pipetteOn ? "#1a1a2e" : "#c8820a";
  const labelColor = pipetteOn ? "#111" : "#ffffff";

  return (
    <group position={[0, 0, -0.6]}>
      {/* Bottle body */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.8, 24]} />
        <meshStandardMaterial color={bottleColor} roughness={0.3} metalness={0.1} />
      </mesh>
      {/* Cap */}
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.27, 0.27, 0.12, 24]} />
        <meshStandardMaterial color={pipetteOn ? "#111" : "#ffffff"} roughness={0.5} />
      </mesh>
      {/* Label */}
      <mesh position={[0, 0.4, 0.251]}>
        <planeGeometry args={[0.35, 0.4]} />
        <meshStandardMaterial color={labelColor} roughness={0.9} />
      </mesh>
    </group>
  );
}

/* ── Pipette cursor ── */
function PipetteCursor({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + 0.4 + Math.sin(clock.getElapsedTime() * 3) * 0.02;
  });

  return (
    <group ref={ref} position={[position[0], position[1] + 0.4, position[2]]}>
      {/* Pipette tube */}
      <mesh>
        <cylinderGeometry args={[0.015, 0.008, 0.3, 8]} />
        <meshStandardMaterial color="#aaaacc" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Bulb */}
      <mesh position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshStandardMaterial color="#cc4444" roughness={0.6} />
      </mesh>
      {/* Drop */}
      <mesh position={[0, -0.17, 0]}>
        <sphereGeometry args={[0.012, 8, 8]} />
        <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={0.5} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

/* ── Reference chart ── */
function ReferenceChart() {
  return (
    <div className="marquis-chart">
      <div className="marquis-chart-title">CHARTE DE MARQUIS</div>
      <div className="marquis-chart-row"><span className="marquis-swatch" style={{ background: "#6b21a8" }} /><span>Benzodiazépine</span></div>
      <div className="marquis-chart-row"><span className="marquis-swatch" style={{ background: "#ea580c" }} /><span>Amphétamine/MDMA</span></div>
      <div className="marquis-chart-row"><span className="marquis-swatch" style={{ background: "#1d4ed8" }} /><span>Opioïde</span></div>
      <div className="marquis-chart-row"><span className="marquis-swatch" style={{ background: "#e8e0d0", border: "1px solid #666" }} /><span>Aucune réaction</span></div>
    </div>
  );
}

/* ── Main scene ── */
function Scene({
  pipetteOn,
  onFoundCountChange,
  hideLabels,
}: {
  pipetteOn: boolean;
  onFoundCountChange: (count: number) => void;
  hideLabels: boolean;
}) {
  const [testedPills, setTestedPills] = useState<Set<number>>(new Set());
  const [pointerPos, setPointerPos] = useState<[number, number, number] | null>(null);

  useEffect(() => {
    onFoundCountChange(testedPills.size);
  }, [testedPills.size, onFoundCountChange]);

  const handleTest = useCallback((index: number) => {
    setTestedPills((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  const handlePointerMove = useCallback(
    (e: any) => {
      if (!pipetteOn) return;
      e.stopPropagation();
      setPointerPos([e.point.x, e.point.y, e.point.z]);
    },
    [pipetteOn]
  );

  return (
    <>
      {/* Floor plane for pointer tracking */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} onPointerMove={handlePointerMove}>
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial transparent opacity={0} />
      </mesh>

      {/* Pill bottle */}
      <PillBottle pipetteOn={pipetteOn} />

      {/* Tray / surface */}
      <mesh position={[0, -0.01, 0.2]}>
        <boxGeometry args={[1.8, 0.02, 1.4]} />
        <meshStandardMaterial color={pipetteOn ? "#111122" : "#e0d8c8"} roughness={0.8} />
      </mesh>

      {/* Pills */}
      {PILLS.map((pill, i) => (
        <PillMesh
          key={i}
          pill={pill}
          index={i}
          pipetteOn={pipetteOn}
          tested={testedPills.has(i)}
          onTest={handleTest}
        />
      ))}

      {/* Pipette cursor */}
      {pipetteOn && pointerPos && <PipetteCursor position={pointerPos} />}
    </>
  );
}

/* ── Main view ── */
export default function SomniferesAnalysis({ onBack }: { onBack: () => void }) {
  const [pipetteOn, setPipetteOn] = useState(false);
  const [foundCount, setFoundCount] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const allFound = foundCount === PILLS.length;

  useEffect(() => {
    if (allFound && pipetteOn) {
      const timer = setTimeout(() => setShowReport(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [allFound, pipetteOn]);

  return (
    <div className="analysis-view">
      <header className="analysis-header">
        <button className="back-btn" onClick={onBack}>← RETOUR</button>
        <div className="header-center">
          <span className="header-dept">POLICE SCIENTIFIQUE</span>
          <span className="header-case">Affaire #2024-0847</span>
        </div>
        <span className="evidence-tag">PIECE A CONV. — SOMNIFERES</span>
      </header>

      <div className="canvas-container">
        <Canvas camera={{ position: [0, 2.5, 2], fov: 40 }}>
          <color attach="background" args={[pipetteOn ? "#0a0a15" : "#0e1525"]} />
          <ambientLight intensity={pipetteOn ? 0.2 : 0.5} />
          <directionalLight position={[5, 5, 5]} intensity={pipetteOn ? 0.3 : 0.7} />
          <directionalLight position={[-3, 2, -2]} intensity={pipetteOn ? 0.1 : 0.3} />

          <Scene pipetteOn={pipetteOn} onFoundCountChange={setFoundCount} hideLabels={showReport} />

          <gridHelper args={[8, 16, "#1a2540", "#111c30"]} position={[0, -0.02, 0]} />
          <OrbitControls enablePan={false} minDistance={2} maxDistance={5} autoRotate={!pipetteOn} autoRotateSpeed={1.5} enabled={!pipetteOn} />
        </Canvas>

        {pipetteOn && <ReferenceChart />}
      </div>

      <div className="tools-bar">
        <button className={`tool-btn marquis ${pipetteOn ? "active" : ""}`} onClick={() => setPipetteOn(!pipetteOn)}>
          <span className="tool-icon">{pipetteOn ? "🧪" : "◎"}</span>
          <span>REACTIF MARQUIS</span>
        </button>
        {pipetteOn && (
          <div className="trace-counter">
            <span className="counter-label">TESTS</span>
            <span className="counter-value">{foundCount}/{PILLS.length}</span>
          </div>
        )}
      </div>

      {pipetteOn && !allFound && (
        <div className="uv-indicator" style={{ borderLeftColor: "#f59e0b" }}>
          <span className="uv-dot" style={{ background: "#f59e0b", boxShadow: "0 0 6px #f59e0b" }} />
          {foundCount === 0
            ? "APPUYEZ SUR CHAQUE COMPRIME POUR APPLIQUER LE REACTIF"
            : `${foundCount}/${PILLS.length} COMPRIMES TESTES`}
        </div>
      )}

      {!pipetteOn && !showReport && (
        <div className="instructions">ACTIVEZ LE REACTIF DE MARQUIS POUR TESTER LES COMPRIMES</div>
      )}

      {showReport && (
        <div className="report-overlay">
          <div className="report-card">
            <div className="report-stripe" />
            <div className="report-header">
              <div className="report-badge-row">
                <span className="report-badge">CONFIDENTIEL</span>
                <span className="report-badge report-badge-blue">LABO. TOXICOLOGIE</span>
              </div>
              <h3>RAPPORT TOXICOLOGIQUE</h3>
              <div className="report-meta">
                <span>Ref. TOX-2024-0847</span>
                <span>Piece : Flacon de somniferes</span>
              </div>
            </div>
            <div className="report-body">
              {PILLS.map((pill, i) => (
                <div key={i} className="report-row">
                  <div className="report-row-num">{String(i + 1).padStart(2, "0")}</div>
                  <div className="report-row-content">
                    <span className="report-row-label">{pill.reportLabel}</span>
                    <span className="report-row-value">{pill.reportValue}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="report-footer">
              <p className="report-instruction">CONCLUSION : MEDICAMENTS CONTREFAITS — SUBSTANCES CONTROLEES</p>
              <button className="report-close-btn" onClick={() => setShowReport(false)}>FERMER LE RAPPORT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
