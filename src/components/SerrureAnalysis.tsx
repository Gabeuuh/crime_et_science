import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";

/* ── Toolmark traces with quiz questions ── */
interface QuizOption {
  label: string;
  correct: boolean;
}

interface TraceData {
  position: [number, number, number];
  scale: number;
  label: string;
  question: string;
  options: QuizOption[];
  reportLabel: string;
  reportValue: string;
}

const TRACES: TraceData[] = [
  {
    position: [0.0, 0.6, 0.32],
    scale: 0.12,
    label: "Stries parallèles",
    question: "Quel outil a laissé ces stries parallèles régulières ?",
    options: [
      { label: "Tournevis plat", correct: true },
      { label: "Pied de biche", correct: false },
      { label: "Pince coupante", correct: false },
    ],
    reportLabel: "Stries parallèles - entrée de serrure",
    reportValue:
      "Stries parallèles espacées de 0.8mm - compatibles avec tournevis plat 6mm. Angle d'insertion : 15°",
  },
  {
    position: [0.25, 1.1, 0.15],
    scale: 0.1,
    label: "Déformation du pêne",
    question: "Quelle technique a causé cette déformation latérale ?",
    options: [
      { label: "Crochetage par raclage", correct: false },
      { label: "Effraction par levier", correct: true },
      { label: "Clé de bumping", correct: false },
    ],
    reportLabel: "Déformation mécanique du pêne",
    reportValue:
      "Pêne demi-tour déformé de 2mm - force estimée 150N appliquée latéralement. Effraction par outil levier",
  },
  {
    position: [-0.2, 0.3, 0.28],
    scale: 0.08,
    label: "Résidus métalliques",
    question: "De quel métal proviennent ces résidus étrangers ?",
    options: [
      { label: "Aluminium (cannette)", correct: false },
      { label: "Acier inoxydable (outil)", correct: true },
      { label: "Cuivre (clé standard)", correct: false },
    ],
    reportLabel: "Résidus métalliques étrangers",
    reportValue:
      "Particules d'acier au chrome (inox) - métal différent du laiton de la serrure. Provenance : outil professionnel",
  },
  {
    position: [0.15, 0.85, 0.25],
    scale: 0.09,
    label: "Cylindre intact",
    question: "Que révèle l'absence d'usure dans le cylindre ?",
    options: [
      { label: "Serrure neuve récemment installée", correct: false },
      { label: "Serrure jamais utilisée avec sa clé", correct: true },
      { label: "Cylindre nettoyé après effraction", correct: false },
    ],
    reportLabel: "Analyse d'usure du cylindre",
    reportValue:
      "Aucune trace d'usure normale de clé - serrure jamais utilisée avec sa clé légitime avant l'effraction",
  },
];

const REVEAL_RADIUS = 0.35;
const SCAN_MIN_DIST = 0.08;
const SCAN_MAX_POINTS = 600;

/* ── Powder spot ── */
function PowderSpot({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.8 + Math.sin(clock.getElapsedTime() * 4) * 0.3;
  });

  return (
    <group position={position}>
      <pointLight color="#44aaff" intensity={2} distance={1.5} />
      <mesh ref={ref}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial
          emissive="#44aaff"
          emissiveIntensity={1}
          transparent
          opacity={0.6}
          color="#224488"
        />
      </mesh>
    </group>
  );
}

/* ── Mark glow (revealed + validated) ── */
function MarkSpot({
  position,
  scale,
  label,
  validated,
}: {
  position: [number, number, number];
  scale: number;
  label: string;
  validated: boolean;
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

  const color = validated ? "#00ff88" : "#ffaa00";

  return (
    <group position={position}>
      <mesh ref={meshRef} renderOrder={10}>
        <sphereGeometry args={[scale, 16, 16]} />
        <meshStandardMaterial
          emissive={color}
          emissiveIntensity={0}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      <mesh renderOrder={9}>
        <sphereGeometry args={[scale * 1.8, 16, 16]} />
        <meshStandardMaterial
          emissive={color}
          emissiveIntensity={0.8}
          transparent
          opacity={0.25}
          depthWrite={false}
        />
      </mesh>
      {label && (
        <Html position={[0, scale + 0.15, 0]} center>
          <div
            className="trace-label"
            style={{
              borderColor: validated ? "#4ade80" : "#f59e0b",
              color: validated ? "#4ade80" : "#f59e0b",
            }}
          >
            {validated ? `✓ ${label}` : `? ${label}`}
          </div>
        </Html>
      )}
    </group>
  );
}

/* ── Powder trail ── */
function PowderTrail({
  pointsRef,
}: {
  pointsRef: React.RefObject<[number, number, number][]>;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lastCount = useRef(0);

  useFrame(() => {
    if (!meshRef.current || !pointsRef.current) return;
    const pts = pointsRef.current;
    if (pts.length === lastCount.current) return;
    for (let i = lastCount.current; i < pts.length; i++) {
      const [x, y, z] = pts[i];
      const len = Math.sqrt(x * x + z * z) || 1;
      dummy.position.set(x + (x / len) * 0.01, y, z + (z / len) * 0.01);
      dummy.lookAt(x + x / len, y, z + z / len);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.count = pts.length;
    meshRef.current.instanceMatrix.needsUpdate = true;
    lastCount.current = pts.length;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, SCAN_MAX_POINTS]}
      renderOrder={5}
    >
      <circleGeometry args={[0.06, 8]} />
      <meshStandardMaterial
        emissive="#334466"
        emissiveIntensity={0.5}
        transparent
        opacity={0.25}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

/* ── 3D Lock model ── */
function Lock({
  powderOn,
  onMarkFound,
  discoveredMarks,
  validatedMarks,
}: {
  powderOn: boolean;
  onMarkFound: (index: number) => void;
  discoveredMarks: Set<number>;
  validatedMarks: Set<number>;
}) {
  const [lightPos, setLightPos] = useState<[number, number, number] | null>(
    null
  );
  const scanPointsRef = useRef<[number, number, number][]>([]);
  const lockColor = powderOn ? "#1a1a22" : "#c8a820";

  useEffect(() => {
    if (!powderOn) {
      setLightPos(null);
      scanPointsRef.current = [];
    }
  }, [powderOn]);

  const handlePointer = useCallback(
    (e: any) => {
      if (!powderOn) return;
      e.stopPropagation();
      const wp = e.point;
      const localPoint: [number, number, number] = [wp.x, wp.y, wp.z];
      setLightPos(localPoint);

      const pts = scanPointsRef.current;
      const last = pts[pts.length - 1];
      const lp = new THREE.Vector3(...localPoint);
      if (
        pts.length < SCAN_MAX_POINTS &&
        (!last || lp.distanceTo(new THREE.Vector3(...last)) > SCAN_MIN_DIST)
      ) {
        pts.push(localPoint);
      }

      TRACES.forEach((trace, i) => {
        if (discoveredMarks.has(i)) return;
        const tracePos = new THREE.Vector3(...trace.position);
        if (lp.distanceTo(tracePos) < REVEAL_RADIUS) {
          navigator.vibrate?.(80);
          onMarkFound(i);
        }
      });
    },
    [powderOn, discoveredMarks, onMarkFound]
  );

  const handlePointerOut = useCallback(() => setLightPos(null), []);

  const pointerProps = powderOn
    ? {
        onPointerDown: handlePointer,
        onPointerMove: handlePointer,
        onPointerUp: handlePointerOut,
        onPointerLeave: handlePointerOut,
      }
    : {};

  const shackleCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.2, 0.8, 0),
        new THREE.Vector3(-0.2, 1.5, 0),
        new THREE.Vector3(0, 1.7, 0),
        new THREE.Vector3(0.2, 1.5, 0),
        new THREE.Vector3(0.2, 1.1, 0),
      ]),
    []
  );

  return (
    <group position={[0, -0.5, 0]}>
      {/* Lock body */}
      <mesh {...pointerProps}>
        <boxGeometry args={[0.7, 0.8, 0.35]} />
        <meshStandardMaterial color={lockColor} roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.18]} {...pointerProps}>
        <planeGeometry args={[0.65, 0.75]} />
        <meshStandardMaterial
          color={powderOn ? "#222233" : "#d4b420"}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>
      {/* Keyhole */}
      <mesh position={[0, 0.05, 0.19]}>
        <circleGeometry args={[0.06, 16]} />
        <meshStandardMaterial color="#111" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.05, 0.19]}>
        <planeGeometry args={[0.03, 0.1]} />
        <meshStandardMaterial color="#111" roughness={0.9} />
      </mesh>
      {/* Shackle */}
      <mesh {...pointerProps}>
        <tubeGeometry args={[shackleCurve, 24, 0.06, 12, false]} />
        <meshStandardMaterial
          color={powderOn ? "#181825" : "#aaa090"}
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>

      {/* Powder trail */}
      {powderOn && <PowderTrail pointsRef={scanPointsRef} />}
      {powderOn && lightPos && <PowderSpot position={lightPos} />}

      {/* Discovered & validated marks */}
      {TRACES.map(
        (trace, i) =>
          discoveredMarks.has(i) && (
            <MarkSpot
              key={i}
              position={trace.position}
              scale={trace.scale}
              label={trace.label}
              validated={validatedMarks.has(i)}
            />
          )
      )}
    </group>
  );
}

/* ── Quiz modal ── */
function QuizModal({
  trace,
  onCorrect,
  onClose,
}: {
  trace: TraceData;
  onCorrect: () => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);

  const handleSelect = (i: number) => {
    if (result) return;
    setSelected(i);
    const isCorrect = trace.options[i].correct;
    setResult(isCorrect ? "correct" : "wrong");

    if (isCorrect) {
      navigator.vibrate?.(80);
      setTimeout(onCorrect, 800);
    } else {
      setTimeout(() => {
        setSelected(null);
        setResult(null);
      }, 1200);
    }
  };

  return (
    <div className="quiz-overlay">
      <div className="quiz-card">
        <div className="quiz-badge">IDENTIFICATION</div>
        <h3 className="quiz-question">{trace.question}</h3>
        <div className="quiz-options">
          {trace.options.map((opt, i) => (
            <button
              key={i}
              className={`quiz-option ${
                selected === i
                  ? result === "correct"
                    ? "correct"
                    : "wrong"
                  : ""
              } ${result === "correct" && opt.correct && selected !== i ? "was-correct" : ""}`}
              onClick={() => handleSelect(i)}
              disabled={result === "correct"}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {result === "wrong" && (
          <p className="quiz-feedback wrong">Incorrect - réessayez</p>
        )}
        {result === "correct" && (
          <p className="quiz-feedback correct">
            Correct ! Marque identifiée.
          </p>
        )}
        <button className="quiz-skip" onClick={onClose}>
          Annuler
        </button>
      </div>
    </div>
  );
}

/* ── Main view ── */
export default function SerrureAnalysis({ onBack }: { onBack: () => void }) {
  const [powderOn, setPowderOn] = useState(false);
  const [discoveredMarks, setDiscoveredMarks] = useState<Set<number>>(
    new Set()
  );
  const [validatedMarks, setValidatedMarks] = useState<Set<number>>(
    new Set()
  );
  const [quizIndex, setQuizIndex] = useState<number | null>(null);
  const [showReport, setShowReport] = useState(false);
  const allValidated = validatedMarks.size === TRACES.length;

  useEffect(() => {
    if (allValidated) {
      const timer = setTimeout(() => setShowReport(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [allValidated]);

  const handleMarkFound = useCallback(
    (i: number) => {
      if (discoveredMarks.has(i)) return;
      setDiscoveredMarks((prev) => {
        const next = new Set(prev);
        next.add(i);
        return next;
      });
      // Open quiz after a brief delay
      setTimeout(() => setQuizIndex(i), 400);
    },
    [discoveredMarks]
  );

  const handleQuizCorrect = useCallback(() => {
    if (quizIndex === null) return;
    setValidatedMarks((prev) => {
      const next = new Set(prev);
      next.add(quizIndex);
      return next;
    });
    setQuizIndex(null);
  }, [quizIndex]);

  return (
    <div className="analysis-view">
      <header className="analysis-header">
        <button className="back-btn" onClick={onBack}>
          ← RETOUR
        </button>
        <div className="header-center">
          <span className="header-dept">POLICE SCIENTIFIQUE</span>
          <span className="header-case">Affaire #2024-0847</span>
        </div>
        <span className="evidence-tag">PIECE A CONV. - SERRURE</span>
      </header>

      <div className="canvas-container">
        <Canvas camera={{ position: [1.5, 1.5, 2.5], fov: 40 }}>
          <color attach="background" args={[powderOn ? "#080810" : "#0e1525"]} />
          <ambientLight
            intensity={powderOn ? 0.1 : 0.5}
            color={powderOn ? "#223344" : "#ffffff"}
          />
          <directionalLight position={[5, 5, 5]} intensity={powderOn ? 0.15 : 0.7} />
          <directionalLight position={[-3, 2, -2]} intensity={powderOn ? 0.05 : 0.3} />

          <Lock
            powderOn={powderOn}
            onMarkFound={handleMarkFound}
            discoveredMarks={discoveredMarks}
            validatedMarks={validatedMarks}
          />

          <gridHelper
            args={[
              8,
              16,
              powderOn ? "#0a0a1a" : "#1a2540",
              powderOn ? "#050510" : "#111c30",
            ]}
            position={[0, -0.92, 0]}
          />
          <OrbitControls
            enablePan={false}
            minDistance={2}
            maxDistance={5}
            autoRotate={!powderOn}
            autoRotateSpeed={1.5}
            enabled={!powderOn}
          />
        </Canvas>
      </div>

      <div className="tools-bar">
        <button
          className={`tool-btn powder ${powderOn ? "active" : ""}`}
          onClick={() => setPowderOn(!powderOn)}
        >
          <span className="tool-icon">{powderOn ? "◉" : "◎"}</span>
          <span>POUDRE MAGNETIQUE</span>
        </button>
        {powderOn && (
          <div className="trace-counter">
            <span className="counter-label">IDENTIFIEES</span>
            <span className="counter-value">
              {validatedMarks.size}/{TRACES.length}
            </span>
          </div>
        )}
      </div>

      {powderOn && !allValidated && (
        <div className="uv-indicator" style={{ borderLeftColor: "#f59e0b" }}>
          <span
            className="uv-dot"
            style={{ background: "#f59e0b", boxShadow: "0 0 6px #f59e0b" }}
          />
          {discoveredMarks.size === 0
            ? "BALAYEZ LA SERRURE POUR TROUVER LES MARQUES"
            : `TROUVEZ ET IDENTIFIEZ LES MARQUES D'OUTILS`}
        </div>
      )}

      {!powderOn && !showReport && (
        <div className="instructions">
          ACTIVEZ LA POUDRE MAGNETIQUE POUR ANALYSER LES TRACES
        </div>
      )}

      {/* Quiz popup */}
      {quizIndex !== null && !validatedMarks.has(quizIndex) && (
        <QuizModal
          trace={TRACES[quizIndex]}
          onCorrect={handleQuizCorrect}
          onClose={() => setQuizIndex(null)}
        />
      )}

      {showReport && (
        <div className="report-overlay">
          <div className="report-card">
            <div className="report-stripe" />
            <div className="report-header">
              <div className="report-badge-row">
                <span className="report-badge">CONFIDENTIEL</span>
                <span className="report-badge report-badge-blue">
                  LABO. TRACES & OUTILS
                </span>
              </div>
              <h3>RAPPORT TOOLMARK</h3>
              <div className="report-meta">
                <span>Ref. TM-2024-0847</span>
                <span>Piece : Serrure porte entree</span>
              </div>
            </div>
            <div className="report-body">
              {TRACES.map((trace, i) => (
                <div key={i} className="report-row">
                  <div className="report-row-num">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="report-row-content">
                    <span className="report-row-label">
                      {trace.reportLabel}
                    </span>
                    <span className="report-row-value">
                      {trace.reportValue}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="report-footer">
              <p className="report-instruction">
                CONCLUSION : EFFRACTION CONFIRMEE - OUTIL PROFESSIONNEL
              </p>
              <button
                className="report-close-btn"
                onClick={() => setShowReport(false)}
              >
                FERMER LE RAPPORT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
