import { useState, useRef, useCallback, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";

/* ── Hidden details in the photo ── */
const DETAILS = [
  {
    position: [0.85, 0.015, -0.45] as [number, number, number],
    scale: 0.12,
    label: "Reflet suspect",
    reportLabel: "Reflet dans le miroir",
    reportValue: "Silhouette humaine visible dans le reflet du miroir — personne non déclarée sur les lieux au moment de la prise de vue",
  },
  {
    position: [-0.6, 0.015, 0.3] as [number, number, number],
    scale: 0.14,
    label: "Ombre incohérente",
    reportLabel: "Analyse des ombres portées",
    reportValue: "Deux directions d'ombre incompatibles — indique un montage ou un éclairage artificiel ajouté post-mortem",
  },
  {
    position: [0.7, 0.015, 0.55] as [number, number, number],
    scale: 0.1,
    label: "Horodatage altéré",
    reportLabel: "Métadonnées EXIF",
    reportValue: "Timestamp EXIF : 2024-03-15 02:34 — incohérent avec luminosité ambiante (plein jour). Métadonnées modifiées par logiciel de retouche",
  },
  {
    position: [-0.75, 0.015, -0.5] as [number, number, number],
    scale: 0.11,
    label: "Traces de retouche",
    reportLabel: "Analyse ELA (Error Level Analysis)",
    reportValue: "Zone de compression JPEG hétérogène — retouche numérique détectée sur le visage du sujet, artefacts de clonage",
  },
];

const REVEAL_RADIUS = 0.35;

/* ── Magnifying glass light ── */
function MagnifierSpot({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.6 + Math.sin(clock.getElapsedTime() * 3) * 0.2;
  });

  return (
    <group position={position}>
      <pointLight color="#ffffff" intensity={2} distance={1.5} />
      {/* Magnifier lens */}
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} renderOrder={15}>
        <ringGeometry args={[0.22, 0.26, 32]} />
        <meshStandardMaterial emissive="#ccaa44" emissiveIntensity={0.8} color="#886622" metalness={0.8} roughness={0.2} side={THREE.DoubleSide} />
      </mesh>
      {/* Glass effect */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={14}>
        <circleGeometry args={[0.22, 32]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.08} emissive="#ffffff" emissiveIntensity={0.3} depthWrite={false} />
      </mesh>
      {/* Handle */}
      <mesh position={[0.2, 0, 0.2]} rotation={[0, 0, -Math.PI / 4]}>
        <cylinderGeometry args={[0.02, 0.025, 0.25, 8]} />
        <meshStandardMaterial color="#664422" roughness={0.6} />
      </mesh>
    </group>
  );
}

/* ── Revealed detail glow ── */
function DetailSpot({ position, scale, label }: { position: [number, number, number]; scale: number; label: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const fadeRef = useRef(0);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    fadeRef.current = Math.min(fadeRef.current + 0.04, 1);
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.opacity = fadeRef.current * 0.7;
    mat.emissiveIntensity = fadeRef.current * (2 + Math.sin(clock.getElapsedTime() * 3) * 0.4);
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} renderOrder={10}>
        <circleGeometry args={[scale, 24]} />
        <meshStandardMaterial emissive="#ff4444" emissiveIntensity={0} transparent opacity={0} color="#441111" depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={9}>
        <ringGeometry args={[scale, scale * 1.3, 24]} />
        <meshStandardMaterial emissive="#ff2222" emissiveIntensity={1} transparent opacity={0.4} color="#000000" depthWrite={false} />
      </mesh>
      {label && (
        <Html position={[0, 0.15, 0]} center>
          <div className="trace-label" style={{ borderColor: "#ef4444", color: "#ef4444" }}>{label}</div>
        </Html>
      )}
    </group>
  );
}

/* ── Crime scene photo (stylized) ── */
function CrimeScenePhoto({
  loupeOn,
  onFoundCountChange,
  hideLabels,
}: {
  loupeOn: boolean;
  onFoundCountChange: (count: number) => void;
  hideLabels: boolean;
}) {
  const [lightPos, setLightPos] = useState<[number, number, number] | null>(null);
  const [revealedDetails, setRevealedDetails] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!loupeOn) setLightPos(null);
  }, [loupeOn]);

  useEffect(() => {
    onFoundCountChange(revealedDetails.size);
  }, [revealedDetails.size, onFoundCountChange]);

  const handlePointer = useCallback(
    (e: any) => {
      if (!loupeOn) return;
      e.stopPropagation();
      const wp = e.point;
      const localPoint: [number, number, number] = [wp.x, wp.y, wp.z];
      setLightPos(localPoint);

      const lp = new THREE.Vector3(...localPoint);
      DETAILS.forEach((detail, i) => {
        const detailPos = new THREE.Vector3(...detail.position);
        if (lp.distanceTo(detailPos) < REVEAL_RADIUS) {
          setRevealedDetails((prev) => {
            if (prev.has(i)) return prev;
            const next = new Set(prev);
            next.add(i);
            navigator.vibrate?.(80);
            return next;
          });
        }
      });
    },
    [loupeOn]
  );

  const handlePointerOut = useCallback(() => setLightPos(null), []);

  const pointerProps = loupeOn
    ? { onPointerDown: handlePointer, onPointerMove: handlePointer, onPointerUp: handlePointerOut, onPointerLeave: handlePointerOut }
    : {};

  return (
    <group>
      {/* Photo base (background) */}
      <mesh position={[0, 0, 0]} {...pointerProps}>
        <boxGeometry args={[2.4, 0.02, 1.6]} />
        <meshStandardMaterial color={loupeOn ? "#1a1a1a" : "#2a2a2a"} roughness={0.9} />
      </mesh>

      {/* Photo border */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.5, 1.7]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.4, 1.6]} />
        <meshStandardMaterial color={loupeOn ? "#1a1a1a" : "#2a2a2a"} roughness={0.9} />
      </mesh>

      {/* Room elements - wall */}
      <mesh position={[0, 0.012, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.2, 0.5]} />
        <meshStandardMaterial color="#3a3530" roughness={0.95} />
      </mesh>

      {/* Floor */}
      <mesh position={[0, 0.012, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.2, 0.9]} />
        <meshStandardMaterial color="#2a2520" roughness={0.95} />
      </mesh>

      {/* Table */}
      <mesh position={[0.2, 0.013, 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.8, 0.5]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.85} />
      </mesh>

      {/* Mirror on wall */}
      <mesh position={[0.85, 0.013, -0.45]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.35, 0.45]} />
        <meshStandardMaterial color="#556677" roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Window */}
      <mesh position={[-0.6, 0.013, -0.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, 0.4]} />
        <meshStandardMaterial color="#667799" roughness={0.5} />
      </mesh>

      {/* Person silhouette */}
      <mesh position={[0.0, 0.013, 0.0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.15, 16]} />
        <meshStandardMaterial color="#222222" roughness={0.9} />
      </mesh>
      <mesh position={[0.0, 0.013, 0.25]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.25, 0.35]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>

      {/* Shadow on floor */}
      <mesh position={[-0.6, 0.013, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.15, 0.4]} />
        <meshStandardMaterial color="#1a1510" transparent opacity={0.6} roughness={0.95} />
      </mesh>

      {/* Timestamp overlay */}
      <mesh position={[0.7, 0.014, 0.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.45, 0.08]} />
        <meshStandardMaterial color="#333333" roughness={0.9} />
      </mesh>

      {/* Magnifier */}
      {loupeOn && lightPos && <MagnifierSpot position={lightPos} />}

      {/* Revealed details */}
      {loupeOn &&
        DETAILS.map(
          (detail, i) =>
            revealedDetails.has(i) && (
              <DetailSpot key={i} position={detail.position} scale={detail.scale} label={hideLabels ? "" : detail.label} />
            )
        )}
    </group>
  );
}

/* ── Main view ── */
export default function PhotoAnalysis({ onBack }: { onBack: () => void }) {
  const [loupeOn, setLoupeOn] = useState(false);
  const [foundCount, setFoundCount] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const allFound = foundCount === DETAILS.length;

  useEffect(() => {
    if (allFound && loupeOn) {
      const timer = setTimeout(() => setShowReport(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [allFound, loupeOn]);

  return (
    <div className="analysis-view">
      <header className="analysis-header">
        <button className="back-btn" onClick={onBack}>← RETOUR</button>
        <div className="header-center">
          <span className="header-dept">POLICE SCIENTIFIQUE</span>
          <span className="header-case">Affaire #2024-0847</span>
        </div>
        <span className="evidence-tag">PIECE A CONV. — PHOTO</span>
      </header>

      <div className="canvas-container">
        <Canvas camera={{ position: [0, 3, 1], fov: 35 }}>
          <color attach="background" args={[loupeOn ? "#0a0a0a" : "#0e1525"]} />
          <ambientLight intensity={loupeOn ? 0.15 : 0.5} />
          <directionalLight position={[5, 5, 5]} intensity={loupeOn ? 0.1 : 0.7} />
          <directionalLight position={[-3, 2, -2]} intensity={loupeOn ? 0.05 : 0.3} />

          <CrimeScenePhoto loupeOn={loupeOn} onFoundCountChange={setFoundCount} hideLabels={showReport} />

          <gridHelper args={[8, 16, "#1a2540", "#111c30"]} position={[0, -0.02, 0]} />
          <OrbitControls enablePan={false} minDistance={2} maxDistance={5} autoRotate={!loupeOn} autoRotateSpeed={1} enabled={!loupeOn} />
        </Canvas>
      </div>

      <div className="tools-bar">
        <button className={`tool-btn loupe ${loupeOn ? "active" : ""}`} onClick={() => setLoupeOn(!loupeOn)}>
          <span className="tool-icon">{loupeOn ? "🔍" : "◎"}</span>
          <span>LOUPE</span>
        </button>
        {loupeOn && (
          <div className="trace-counter">
            <span className="counter-label">DETAILS</span>
            <span className="counter-value">{foundCount}/{DETAILS.length}</span>
          </div>
        )}
      </div>

      {loupeOn && !allFound && (
        <div className="uv-indicator" style={{ borderLeftColor: "#ef4444" }}>
          <span className="uv-dot" style={{ background: "#ef4444", boxShadow: "0 0 6px #ef4444" }} />
          {foundCount === 0
            ? "EXAMINEZ LA PHOTO AVEC LA LOUPE"
            : `${foundCount}/${DETAILS.length} ANOMALIES DETECTEES`}
        </div>
      )}

      {!loupeOn && !showReport && (
        <div className="instructions">ACTIVEZ LA LOUPE POUR EXAMINER LA PHOTOGRAPHIE</div>
      )}

      {showReport && (
        <div className="report-overlay">
          <div className="report-card">
            <div className="report-stripe" />
            <div className="report-header">
              <div className="report-badge-row">
                <span className="report-badge">CONFIDENTIEL</span>
                <span className="report-badge report-badge-blue">LABO. IMAGE FORENSIQUE</span>
              </div>
              <h3>RAPPORT D'ANALYSE</h3>
              <div className="report-meta">
                <span>Ref. IMG-2024-0847</span>
                <span>Piece : Photographie scene</span>
              </div>
            </div>
            <div className="report-body">
              {DETAILS.map((detail, i) => (
                <div key={i} className="report-row">
                  <div className="report-row-num">{String(i + 1).padStart(2, "0")}</div>
                  <div className="report-row-content">
                    <span className="report-row-label">{detail.reportLabel}</span>
                    <span className="report-row-value">{detail.reportValue}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="report-footer">
              <p className="report-instruction">CONCLUSION : PHOTOGRAPHIE MANIPULEE NUMERIQUEMENT</p>
              <button className="report-close-btn" onClick={() => setShowReport(false)}>FERMER LE RAPPORT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
