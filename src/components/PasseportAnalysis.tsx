import { useState, useRef, useCallback, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";

/* ── Trace data — each anomaly is visible only in a specific wavelength range ── */
const TRACES = [
  {
    position: [0.0, 0.026, 0.15] as [number, number, number],
    scale: 0.14,
    wlMin: 200,
    wlMax: 380,
    band: "UV" as const,
    label: "Filigrane altéré",
    reportLabel: "Filigrane de sécurité",
    reportValue:
      "Filigrane partiellement effacé par solvant chimique — motif RF non conforme au standard ISO 7501",
  },
  {
    position: [-0.5, 0.026, -0.3] as [number, number, number],
    scale: 0.12,
    wlMin: 200,
    wlMax: 380,
    band: "UV" as const,
    label: "Traces de colle",
    reportLabel: "Zone photo d'identité",
    reportValue:
      "Fluorescence résiduelle de colle cyanoacrylate — photo recollée après substitution",
  },
  {
    position: [0.5, 0.026, 0.0] as [number, number, number],
    scale: 0.1,
    wlMin: 750,
    wlMax: 1000,
    band: "IR" as const,
    label: "Encre différente",
    reportLabel: "Date de naissance",
    reportValue:
      "Encre à base de colorant (visible IR) différente de l'encre d'origine à base de pigment — date modifiée",
  },
  {
    position: [0.45, 0.026, -0.55] as [number, number, number],
    scale: 0.12,
    wlMin: 750,
    wlMax: 1000,
    band: "IR" as const,
    label: "Tampon contrefait",
    reportLabel: "Tampon d'entrée Schengen",
    reportValue:
      "Absorption IR incohérente — encre jet d'encre domestique, non tampographie officielle",
  },
];

/* ── Pulsing anomaly spot — only appears when wavelength is in range ── */
function AnomalySpot({
  trace,
  visible,
  found,
  onFlag,
}: {
  trace: (typeof TRACES)[0];
  visible: boolean;
  found: boolean;
  onFlag: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef(0);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (found) {
      mat.emissiveIntensity = 2.5;
      mat.opacity = 0.85;
    } else if (visible) {
      pulseRef.current = Math.min(pulseRef.current + 0.04, 1);
      mat.emissiveIntensity =
        pulseRef.current * (1.5 + Math.sin(clock.getElapsedTime() * 4) * 0.6);
      mat.opacity = pulseRef.current * 0.75;
    } else {
      pulseRef.current = 0;
      mat.opacity = 0;
      mat.emissiveIntensity = 0;
    }
  });

  const handleClick = useCallback(
    (e: any) => {
      if (!visible || found) return;
      e.stopPropagation();
      onFlag();
    },
    [visible, found, onFlag]
  );

  return (
    <group position={trace.position}>
      {/* Outer glow ring */}
      {(visible || found) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={9}>
          <ringGeometry args={[trace.scale, trace.scale * 1.6, 32]} />
          <meshStandardMaterial
            emissive={found ? "#00ff88" : "#ffaa00"}
            emissiveIntensity={1.5}
            transparent
            opacity={0.3}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Main clickable spot */}
      <mesh ref={meshRef} onClick={handleClick} rotation={[-Math.PI / 2, 0, 0]} renderOrder={10}>
        <circleGeometry args={[trace.scale, 24]} />
        <meshStandardMaterial
          emissive={found ? "#00ff88" : "#ffaa00"}
          emissiveIntensity={0}
          transparent
          opacity={0}
          color={found ? "#003322" : "#332200"}
          depthWrite={false}
        />
      </mesh>

      {/* Label */}
      {(visible || found) && (
        <Html position={[0, 0.18, 0]} center>
          <div
            className="trace-label"
            style={
              found
                ? { borderColor: "#4ade80", color: "#4ade80" }
                : { borderColor: "#f59e0b", color: "#f59e0b", cursor: "pointer" }
            }
          >
            {found ? `✓ ${trace.label}` : `⊕ ${trace.label}`}
          </div>
        </Html>
      )}
    </group>
  );
}

/* ── 3D Passport model ── */
function Passport({
  wavelength,
  onFoundCountChange,
  hideLabels,
}: {
  wavelength: number;
  onFoundCountChange: (count: number) => void;
  hideLabels: boolean;
}) {
  const [flagged, setFlagged] = useState<Set<number>>(new Set());

  const isUV = wavelength < 380;
  const isIR = wavelength > 750;
  const isActive = isUV || isIR;

  const coverColor = isUV ? "#1a0e2e" : isIR ? "#1a0505" : "#1a3a5a";
  const pageColor = isUV ? "#0d0520" : isIR ? "#0d0505" : "#f5f0e0";

  useEffect(() => {
    onFoundCountChange(flagged.size);
  }, [flagged.size, onFoundCountChange]);

  const handleFlag = useCallback((i: number) => {
    setFlagged((prev) => {
      if (prev.has(i)) return prev;
      const next = new Set(prev);
      next.add(i);
      navigator.vibrate?.(80);
      return next;
    });
  }, []);

  return (
    <group>
      {/* Cover bottom */}
      <mesh position={[0, -0.04, 0]}>
        <boxGeometry args={[1.5, 0.04, 1.1]} />
        <meshStandardMaterial color={coverColor} roughness={0.4} metalness={0.1} />
      </mesh>
      {/* Pages */}
      <mesh position={[0, 0.0, 0]}>
        <boxGeometry args={[1.4, 0.05, 1.0]} />
        <meshStandardMaterial color={pageColor} roughness={0.8} />
      </mesh>
      {/* Cover top (open) */}
      <mesh position={[-0.85, 0.15, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[1.5, 0.04, 1.1]} />
        <meshStandardMaterial color={coverColor} roughness={0.4} metalness={0.1} />
      </mesh>
      {/* Photo placeholder */}
      <mesh position={[-0.5, 0.026, -0.25]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.35, 0.45]} />
        <meshStandardMaterial color={isActive ? "#111" : "#ccbbaa"} roughness={0.9} />
      </mesh>
      {/* Text lines */}
      {[0.2, 0.1, 0.0, -0.1, -0.2].map((z, i) => (
        <mesh key={i} position={[0.2, 0.026, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.6, 0.03]} />
          <meshStandardMaterial color={isActive ? "#111" : "#999"} roughness={0.9} />
        </mesh>
      ))}
      {/* Stamp circle */}
      <mesh position={[0.45, 0.026, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.13, 32]} />
        <meshStandardMaterial
          color={isActive ? "#111" : "#cc4444"}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Anomaly spots */}
      {TRACES.map((trace, i) => {
        const visible = wavelength >= trace.wlMin && wavelength <= trace.wlMax;
        return (
          <AnomalySpot
            key={i}
            trace={trace}
            visible={visible && !hideLabels}
            found={flagged.has(i)}
            onFlag={() => handleFlag(i)}
          />
        );
      })}
    </group>
  );
}

/* ── Wavelength helpers ── */
function getWavelengthColor(wl: number): string {
  if (wl < 380) return `hsl(270, 80%, ${30 + ((380 - wl) / 180) * 30}%)`;
  if (wl > 750) return `hsl(0, 70%, ${30 + ((wl - 750) / 250) * 25}%)`;
  // Visible spectrum approximation
  const t = (wl - 380) / (750 - 380);
  const hue = 270 - t * 270; // violet→red
  return `hsl(${hue}, 85%, 50%)`;
}

function getBandLabel(wl: number): string {
  if (wl < 380) return "ULTRAVIOLET";
  if (wl > 750) return "INFRAROUGE";
  return "VISIBLE";
}

/* ── Main view ── */
export default function PasseportAnalysis({ onBack }: { onBack: () => void }) {
  const [wavelength, setWavelength] = useState(550);
  const [foundCount, setFoundCount] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const allFound = foundCount === TRACES.length;

  const isUV = wavelength < 380;
  const isIR = wavelength > 750;
  const isActive = isUV || isIR;

  useEffect(() => {
    if (allFound) {
      const timer = setTimeout(() => setShowReport(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [allFound]);

  const bgColor = isUV ? "#05091a" : isIR ? "#1a0505" : "#0e1525";
  const wlColor = getWavelengthColor(wavelength);

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
        <span className="evidence-tag">PIECE A CONV. — PASSEPORT</span>
      </header>

      <div className="canvas-container">
        <Canvas camera={{ position: [0, 2.5, 1.5], fov: 40 }}>
          <color attach="background" args={[bgColor]} />
          <ambientLight
            intensity={isActive ? 0.04 : 0.5}
            color={isUV ? "#220044" : isIR ? "#440000" : "#ffffff"}
          />
          <directionalLight position={[5, 5, 5]} intensity={isActive ? 0.03 : 0.7} />
          <directionalLight position={[-3, 2, -2]} intensity={isActive ? 0.01 : 0.3} />

          <Passport
            wavelength={wavelength}
            onFoundCountChange={setFoundCount}
            hideLabels={showReport}
          />

          <gridHelper
            args={[8, 16, isActive ? "#1a0033" : "#1a2540", isActive ? "#0d001a" : "#111c30"]}
            position={[0, -0.07, 0]}
          />
          <OrbitControls
            enablePan={false}
            minDistance={2}
            maxDistance={5}
            autoRotate={!isActive}
            autoRotateSpeed={1.5}
          />
        </Canvas>
      </div>

      {/* ── Wavelength slider ── */}
      <div className="wavelength-bar">
        <div className="wl-band-label" style={{ color: wlColor }}>
          {getBandLabel(wavelength)}
        </div>
        <div className="wl-slider-row">
          <span className="wl-edge-label">UV</span>
          <div className="wl-slider-wrap">
            <input
              type="range"
              className="wl-slider"
              min={200}
              max={1000}
              value={wavelength}
              onChange={(e) => setWavelength(Number(e.target.value))}
            />
          </div>
          <span className="wl-edge-label">IR</span>
        </div>
        <div className="wl-value" style={{ color: wlColor }}>
          {wavelength} nm
        </div>
        {isActive && (
          <div className="wl-hint">
            {foundCount === 0
              ? "IDENTIFIEZ LES ANOMALIES EN APPUYANT DESSUS"
              : `${foundCount}/${TRACES.length} ANOMALIES IDENTIFIEES`}
          </div>
        )}
      </div>

      {!isActive && !showReport && (
        <div className="instructions">
          DEPLACEZ LE CURSEUR VERS UV OU IR POUR REVELER LES FALSIFICATIONS
        </div>
      )}

      {showReport && (
        <div className="report-overlay">
          <div className="report-card">
            <div className="report-stripe" />
            <div className="report-header">
              <div className="report-badge-row">
                <span className="report-badge">CONFIDENTIEL</span>
                <span className="report-badge report-badge-blue">
                  LABO. DOCUMENTS & TRACES
                </span>
              </div>
              <h3>RAPPORT VSC</h3>
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
                    <span className="report-row-label">
                      [{trace.band}] {trace.reportLabel}
                    </span>
                    <span className="report-row-value">{trace.reportValue}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="report-footer">
              <p className="report-instruction">
                CONCLUSION : DOCUMENT FALSIFIE — IDENTITE USURPEE
              </p>
              <button className="report-close-btn" onClick={() => setShowReport(false)}>
                FERMER LE RAPPORT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
