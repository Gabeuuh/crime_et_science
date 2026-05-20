import { useState, useCallback, useEffect, useRef } from "react";
import HelpButton from "./HelpButton";

/* ── Secret code (found in physical dossier) ── */
const SECRET_CODE = "7291";

/* ── Data copy timeline (22 days) ── */
const DATA_POINTS = [
  { day: 1, pct: 2 },
  { day: 2, pct: 5 },
  { day: 3, pct: 8 },
  { day: 5, pct: 14 },
  { day: 7, pct: 22 },
  { day: 9, pct: 30 },
  { day: 11, pct: 38 },
  { day: 13, pct: 47 },
  { day: 15, pct: 58 },
  { day: 17, pct: 68 },
  { day: 19, pct: 79 },
  { day: 20, pct: 85 },
  { day: 21, pct: 93 },
  { day: 22, pct: 100 },
];

type Phase = "locked" | "decrypting" | "unlocked";

export default function CleUSBAnalysis({ onBack, onCollectClue, isCollected }: { onBack: () => void; onCollectClue?: () => void; isCollected?: boolean }) {
  const [code, setCode] = useState(["", "", "", ""]);
  const [phase, setPhase] = useState<Phase>("locked");
  const [error, setError] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [graphProgress, setGraphProgress] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* ── Handle digit input ── */
  const handleDigit = useCallback(
    (index: number, value: string) => {
      if (phase !== "locked") return;
      const digit = value.replace(/\D/g, "").slice(-1);
      setCode((prev) => {
        const next = [...prev];
        next[index] = digit;
        return next;
      });
      setError(false);

      // Auto-focus next input
      if (digit && index < 3) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [phase]
  );

  /* ── Handle backspace ── */
  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && !code[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [code]
  );

  /* ── Submit code ── */
  const handleSubmit = useCallback(() => {
    const entered = code.join("");
    if (entered === SECRET_CODE) {
      navigator.vibrate?.(120);
      setPhase("decrypting");
      // Decrypt animation
      setTimeout(() => setPhase("unlocked"), 2500);
    } else {
      setError(true);
      navigator.vibrate?.([100, 50, 100]);
      setCode(["", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  }, [code]);

  /* ── Graph animation ── */
  useEffect(() => {
    if (phase !== "unlocked") return;
    const timer = setInterval(() => {
      setGraphProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 2;
      });
    }, 30);
    return () => clearInterval(timer);
  }, [phase]);

  /* ── Auto-show report ── */
  useEffect(() => {
    if (graphProgress >= 100) {
      const timer = setTimeout(() => setShowReport(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [graphProgress]);

  /* ── Auto-submit when all digits entered ── */
  useEffect(() => {
    if (code.every((d) => d !== "") && phase === "locked") {
      const timer = setTimeout(handleSubmit, 300);
      return () => clearTimeout(timer);
    }
  }, [code, phase, handleSubmit]);

  return (
    <div className="analysis-view">
      <header className="analysis-header" style={{ position: "relative" }}>
        <button className="back-btn" onClick={onBack}>
          ← RETOUR
        </button>
        <div className="header-center">
          <span className="header-dept">ENQUETE SOUS-MARINE</span>
          <span className="header-case">Mission Abysse-7</span>
        </div>
        <span className="evidence-tag">INDICE 5 - DISQUE DUR</span>
        <HelpButton
          title="AIDE - DISQUE DUR CHIFFRÉ"
          lines={[
            "Cherche le code à 4 chiffres dans le dossier physique fourni.",
            "Saisis-le dans les 4 cases - la validation est automatique.",
            "Le graphique révèle l'historique de copie des données une fois déchiffré.",
          ]}
        />
      </header>
      <div className="role-banner">RÔLE : INSPECTEUR - Interface d'analyse</div>

      <div className="canvas-container usb-container">
        {/* USB Drive visual */}
        <div className={`usb-device ${phase}`}>
          <div className="usb-body">
            <div className="usb-connector" />
            <div className="usb-label">USB-ENCRYPTED</div>
            <div className={`usb-led ${phase === "decrypting" ? "blink" : phase === "unlocked" ? "on" : ""}`} />
          </div>
        </div>

        {/* Code entry (locked phase) */}
        {phase === "locked" && (
          <div className="code-entry">
            <div className="code-title">ACCES CHIFFRE</div>
            <div className="code-subtitle">
              Entrez le code de déchiffrement
            </div>
            <div className="code-inputs">
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigit(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={`code-digit ${error ? "error" : ""}`}
                  autoFocus={i === 0}
                />
              ))}
            </div>
            {error && (
              <p className="code-error">CODE INCORRECT - REESSAYEZ</p>
            )}
            <p className="code-hint">
              Cherchez le code dans le dossier physique
            </p>
          </div>
        )}

        {/* Decryption animation */}
        {phase === "decrypting" && (
          <div className="decrypt-animation">
            <div className="decrypt-spinner" />
            <div className="decrypt-text">DECHIFFREMENT EN COURS...</div>
            <div className="decrypt-progress">
              <div className="decrypt-bar" />
            </div>
          </div>
        )}

        {/* Data graph (unlocked phase) */}
        {phase === "unlocked" && (
          <div className="usb-data">
            <div className="graph-title">
              HISTORIQUE DE COPIE DES DONNEES
            </div>
            <div className="graph-subtitle">
              Cartographie sous-marine - 22 jours de mission
            </div>
            <div className="data-graph">
              {/* Y axis */}
              <div className="graph-y-axis">
                <span>100%</span>
                <span>75%</span>
                <span>50%</span>
                <span>25%</span>
                <span>0%</span>
              </div>
              {/* Graph area */}
              <div className="graph-area">
                <svg viewBox="0 0 220 100" className="graph-svg">
                  {/* Grid lines */}
                  <line x1="0" y1="25" x2="220" y2="25" stroke="#1e3a5f" strokeWidth="0.5" />
                  <line x1="0" y1="50" x2="220" y2="50" stroke="#1e3a5f" strokeWidth="0.5" />
                  <line x1="0" y1="75" x2="220" y2="75" stroke="#1e3a5f" strokeWidth="0.5" />

                  {/* Data line */}
                  <polyline
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={DATA_POINTS.filter(
                      (_, i) =>
                        (i / DATA_POINTS.length) * 100 <= graphProgress
                    )
                      .map(
                        (pt) =>
                          `${(pt.day / 22) * 210 + 5},${100 - pt.pct}`
                      )
                      .join(" ")}
                  />

                  {/* Data dots */}
                  {DATA_POINTS.filter(
                    (_, i) =>
                      (i / DATA_POINTS.length) * 100 <= graphProgress
                  ).map((pt, i) => (
                    <circle
                      key={i}
                      cx={(pt.day / 22) * 210 + 5}
                      cy={100 - pt.pct}
                      r="3"
                      fill="#ef4444"
                    />
                  ))}

                  {/* "Evacuation" marker */}
                  {graphProgress >= 95 && (
                    <>
                      <line
                        x1="215"
                        y1="0"
                        x2="215"
                        y2="100"
                        stroke="#f59e0b"
                        strokeWidth="1"
                        strokeDasharray="4"
                      />
                      <text
                        x="205"
                        y="12"
                        fill="#f59e0b"
                        fontSize="6"
                        textAnchor="end"
                      >
                        EVACUATION
                      </text>
                    </>
                  )}
                </svg>
              </div>
              {/* X axis */}
              <div className="graph-x-axis">
                <span>J1</span>
                <span>J5</span>
                <span>J10</span>
                <span>J15</span>
                <span>J22</span>
              </div>
            </div>
            <div className="graph-conclusion" style={{ color: "#cbd5e1" }}>
              Les données ont été copiées progressivement depuis le JOUR 1 de
              la mission — le vol était planifié avant l'embarquement.
            </div>
          </div>
        )}
      </div>

      <div className="tools-bar">
        <div className="trace-counter">
          <span className="counter-label">STATUT</span>
          <span className="counter-value">
            {phase === "locked"
              ? "VERROUILLE"
              : phase === "decrypting"
              ? "DECHIFFREMENT"
              : "DEVERROUILLE"}
          </span>
        </div>
      </div>

      {phase === "locked" && (
        <div
          className="uv-indicator"
          style={{ borderLeftColor: "#ef4444" }}
        >
          <span
            className="uv-dot"
            style={{ background: "#ef4444", boxShadow: "0 0 6px #ef4444" }}
          />
          TROUVEZ LE CODE DANS LE DOSSIER PHYSIQUE
        </div>
      )}

      {showReport && (
        <div className="report-overlay">
          <div className="report-card">
            <div className="report-stripe" />
            <div className="report-header">
                <h3>RAPPORT - DISQUE DUR</h3>
            </div>
            <div className="report-body">
              <div className="report-row">
                <div className="report-row-num">01</div>
                <div className="report-row-content">
                  <span className="report-row-label">Contenu</span>
                  <span className="report-row-value">
                    Copies complètes des données de cartographie sous-marine
                    classifiées - 847 Go de données extraites
                  </span>
                </div>
              </div>
              <div className="report-row">
                <div className="report-row-num">02</div>
                <div className="report-row-content">
                  <span className="report-row-label">Chronologie</span>
                  <span className="report-row-value">
                    Copie progressive sur 22 jours (J1 à J22). Le vol a
                    commencé dès le premier jour de la mission.
                  </span>
                </div>
              </div>
              <div className="report-row">
                <div className="report-row-num">03</div>
                <div className="report-row-content">
                  <span className="report-row-label">Conclusion</span>
                  <span className="report-row-value">
                    Le sabotage (alarme incendie) ne servait pas à voler les
                    données - elles étaient déjà copiées. Il servait à couvrir
                    la fuite de Léa Fontaine.
                  </span>
                </div>
              </div>
            </div>
            <div className="report-footer">
              <p className="report-instruction">
                CONCLUSION : VOL DE DONNEES PLANIFIE DEPUIS LE DEBUT - LE
                SABOTAGE SERVAIT A COUVRIR LA FUITE
              </p>
              {!isCollected ? (
                <button className="collect-clue-btn" onClick={() => onCollectClue?.()}>
                  COLLECTER L'INDICE
                </button>
              ) : (
                <>
                  <div className="clue-collected-badge">✓ INDICE COLLECTÉ</div>
                  <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                    <button className="report-close-btn" onClick={() => setShowReport(false)}>
                      FERMER
                    </button>
                    <button className="report-close-btn" style={{ background: "rgba(30,58,95,0.8)", borderColor: "rgba(96,165,250,0.5)", color: "#93c5fd" }} onClick={onBack}>
                      ← RETOUR À L'ACCUEIL
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
