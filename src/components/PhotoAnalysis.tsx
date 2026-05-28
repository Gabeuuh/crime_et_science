import { useState, useCallback, useEffect } from "react";

/* ── Analysis filter modes ── */
type FilterMode = "normal" | "ela" | "niveaux" | "exif";

const MODE_LABELS: Record<FilterMode, string> = {
  normal: "NORMAL",
  ela: "ELA",
  niveaux: "NIVEAUX",
  exif: "EXIF",
};

const MODE_DESCRIPTIONS: Record<FilterMode, string> = {
  normal: "Vue standard - cherchez les anomalies visibles",
  ela: "Error Level Analysis - zones retouchées en surbrillance",
  niveaux: "Egalisation - révèle les incohérences d'éclairage",
  exif: "Métadonnées - informations cachées du fichier",
};

/* ── Anomalies - each visible only in a specific mode ── */
const ANOMALIES = [
  {
    id: 0,
    x: 78,
    y: 22,
    w: 16,
    h: 24,
    visibleIn: "normal" as FilterMode,
    label: "Reflet suspect",
    hint: "Regardez dans le miroir...",
    reportLabel: "Reflet dans le miroir",
    reportValue:
      "Silhouette humaine visible dans le reflet du miroir - personne non déclarée sur les lieux au moment de la prise de vue",
  },
  {
    id: 1,
    x: 32,
    y: 35,
    w: 14,
    h: 18,
    visibleIn: "ela" as FilterMode,
    label: "Zone retouchée",
    hint: "Compression JPEG incohérente...",
    reportLabel: "Analyse ELA (Error Level Analysis)",
    reportValue:
      "Zone de compression JPEG hétérogène - retouche numérique détectée sur le visage du sujet, artefacts de clonage",
  },
  {
    x: 12,
    y: 55,
    w: 18,
    h: 25,
    id: 2,
    visibleIn: "niveaux" as FilterMode,
    label: "Ombre incohérente",
    hint: "Direction d'éclairage suspecte...",
    reportLabel: "Analyse des ombres portées",
    reportValue:
      "Deux directions d'ombre incompatibles - indique un montage ou un éclairage artificiel ajouté",
  },
  {
    id: 3,
    x: 62,
    y: 82,
    w: 30,
    h: 10,
    visibleIn: "exif" as FilterMode,
    label: "Timestamp modifié",
    hint: "Les métadonnées ne correspondent pas...",
    reportLabel: "Métadonnées EXIF",
    reportValue:
      "Timestamp EXIF : 2024-03-15 02:34 - incohérent avec luminosité ambiante (plein jour). Logiciel de retouche détecté dans le champ Software",
  },
];

export default function PhotoAnalysis({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<FilterMode>("normal");
  const [found, setFound] = useState<Set<number>>(new Set());
  const [showReport, setShowReport] = useState(false);
  const allFound = found.size === ANOMALIES.length;

  useEffect(() => {
    if (allFound) {
      const timer = setTimeout(() => setShowReport(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [allFound]);

  const handleFind = useCallback(
    (i: number) => {
      const anomaly = ANOMALIES[i];
      if (anomaly.visibleIn !== mode) return;
      setFound((prev) => {
        if (prev.has(i)) return prev;
        const next = new Set(prev);
        next.add(i);
        navigator.vibrate?.(80);
        return next;
      });
    },
    [mode]
  );

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
        <span className="evidence-tag">PIECE A CONV. - PHOTO</span>
      </header>

      <div className="canvas-container">
        <div className={`photo-scene mode-${mode}`}>
          {/* ── Crime scene elements ── */}

          {/* Back wall */}
          <div className="ph-wall" />

          {/* Floor */}
          <div className="ph-floor" />

          {/* Window */}
          <div className="ph-window">
            <div className="ph-window-pane" />
            <div className="ph-window-pane" />
          </div>

          {/* Light from window */}
          <div className="ph-light-beam" />

          {/* Table */}
          <div className="ph-table" />

          {/* Items on table */}
          <div className="ph-glass" />
          <div className="ph-paper" />

          {/* Person silhouette */}
          <div className="ph-person">
            <div className="ph-person-head" />
            <div className="ph-person-body" />
          </div>

          {/* Person shadow (the inconsistent one) */}
          <div className="ph-shadow" />
          <div className="ph-shadow-2" />

          {/* Mirror */}
          <div className="ph-mirror">
            <div className="ph-mirror-reflection" />
          </div>

          {/* Timestamp overlay */}
          <div className="ph-timestamp">15/03/2024 02:34:17</div>

          {/* EXIF metadata overlay (only in exif mode) */}
          <div className="ph-exif-overlay">
            <div>Camera: Canon EOS 5D Mark IV</div>
            <div>ISO: 200 | f/2.8 | 1/60s</div>
            <div>GPS: 48.8566°N, 2.3522°E</div>
            <div className="ph-exif-alert">
              Software: Adobe Photoshop CC 2024
            </div>
            <div className="ph-exif-alert">
              ModifyDate: 2024-03-16 14:22:05
            </div>
            <div className="ph-exif-alert">
              OriginalDate: 2024-03-15 02:34:17 ⚠
            </div>
          </div>

          {/* ── Anomaly click zones ── */}
          {ANOMALIES.map((anomaly, i) => {
            const isVisible = anomaly.visibleIn === mode;
            const isFound = found.has(i);
            return (
              <button
                key={i}
                className={`ph-anomaly ${isVisible ? "visible" : ""} ${isFound ? "found" : ""}`}
                style={{
                  left: `${anomaly.x}%`,
                  top: `${anomaly.y}%`,
                  width: `${anomaly.w}%`,
                  height: `${anomaly.h}%`,
                }}
                onClick={() => handleFind(i)}
              >
                {isFound && (
                  <span className="ph-anomaly-badge">✓ {anomaly.label}</span>
                )}
                {isVisible && !isFound && (
                  <span className="ph-anomaly-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Filter mode toolbar ── */}
      <div className="tools-bar photo-tools">
        {(Object.keys(MODE_LABELS) as FilterMode[]).map((m) => (
          <button
            key={m}
            className={`tool-btn filter-btn ${mode === m ? "active" : ""}`}
            onClick={() => setMode(m)}
          >
            <span>{MODE_LABELS[m]}</span>
          </button>
        ))}
        <div className="trace-counter">
          <span className="counter-label">INDICES</span>
          <span className="counter-value">
            {found.size}/{ANOMALIES.length}
          </span>
        </div>
      </div>

      {!allFound && (
        <div
          className="uv-indicator"
          style={{ borderLeftColor: "#ef4444" }}
        >
          <span
            className="uv-dot"
            style={{ background: "#ef4444", boxShadow: "0 0 6px #ef4444" }}
          />
          {MODE_DESCRIPTIONS[mode]}
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
                  LABO. IMAGE FORENSIQUE
                </span>
              </div>
              <h3>RAPPORT D'ANALYSE</h3>
              <div className="report-meta">
                <span>Ref. IMG-2024-0847</span>
                <span>Piece : Photographie scene</span>
              </div>
            </div>
            <div className="report-body">
              {ANOMALIES.map((a, i) => (
                <div key={i} className="report-row">
                  <div className="report-row-num">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="report-row-content">
                    <span className="report-row-label">{a.reportLabel}</span>
                    <span className="report-row-value">{a.reportValue}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="report-footer">
              <p className="report-instruction">
                CONCLUSION : PHOTOGRAPHIE MANIPULÉE NUMÉRIQUEMENT
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
