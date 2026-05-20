import { useState, useRef, useCallback, useEffect } from "react";
import HelpButton from "./HelpButton";

/* ── Hidden text zones (indentations from previous page) ── */
const TEXT_ZONES = [
  {
    // Relative positions in % of canvas
    x: 12,
    y: 15,
    w: 76,
    h: 8,
    text: "RDV 22h - laboratoire",
    reportLabel: "Indentation ligne 1",
    reportValue:
      '"RDV 22h - laboratoire" - pression stylo bille forte, écriture rapide',
  },
  {
    x: 12,
    y: 33,
    w: 60,
    h: 8,
    text: "augmenter dose ×2",
    reportLabel: "Indentation ligne 2",
    reportValue:
      '"augmenter dose ×2" - même stylo, traits appuyés sur le ×2',
  },
  {
    x: 12,
    y: 51,
    w: 55,
    h: 8,
    text: "ne rien dire à M.",
    reportLabel: "Indentation ligne 3",
    reportValue:
      '"ne rien dire à M." - pression réduite, écriture hésitante',
  },
  {
    x: 12,
    y: 69,
    w: 72,
    h: 8,
    text: "clé cachée sous pot fleurs",
    reportLabel: "Indentation ligne 4",
    reportValue:
      '"clé cachée sous pot fleurs" - tracé ferme, souligné deux fois',
  },
];

const SCRATCH_RADIUS = 28;
const REVEAL_THRESHOLD = 0.45;

export default function CarnetAnalysis({ onBack, onCollectClue, isCollected }: { onBack: () => void; onCollectClue?: () => void; isCollected?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [esdaOn, setEsdaOn] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [showReport, setShowReport] = useState(false);
  const isDrawing = useRef(false);
  const allFound = revealed.size === TEXT_ZONES.length;

  /* ── Initialize dark overlay canvas ── */
  useEffect(() => {
    if (!esdaOn) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#12162a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add some "film grain" texture
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = `rgba(40, 60, 120, ${Math.random() * 0.3})`;
      ctx.fillRect(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        1,
        1
      );
    }
  }, [esdaOn]);

  /* ── Auto-show report ── */
  useEffect(() => {
    if (allFound && esdaOn) {
      const timer = setTimeout(() => setShowReport(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [allFound, esdaOn]);

  /* ── Check coverage for each text zone ── */
  const checkZones = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    TEXT_ZONES.forEach((zone, i) => {
      if (revealed.has(i)) return;
      const zx = Math.floor((zone.x / 100) * canvas.width);
      const zy = Math.floor((zone.y / 100) * canvas.height);
      const zw = Math.floor((zone.w / 100) * canvas.width);
      const zh = Math.floor((zone.h / 100) * canvas.height);

      const imageData = ctx.getImageData(zx, zy, zw, zh);
      let cleared = 0;
      const total = zw * zh;
      for (let p = 3; p < imageData.data.length; p += 4) {
        if (imageData.data[p] < 128) cleared++;
      }

      if (cleared / total > REVEAL_THRESHOLD) {
        setRevealed((prev) => {
          if (prev.has(i)) return prev;
          const next = new Set(prev);
          next.add(i);
          navigator.vibrate?.(80);
          return next;
        });
      }
    });
  }, [revealed]);

  /* ── Scratch at position ── */
  const scratchAt = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // Erase pixels (scratch)
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, SCRATCH_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      // Add blue electrostatic sparks at scratch edge
      for (let s = 0; s < 4; s++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = SCRATCH_RADIUS + Math.random() * 8;
        ctx.fillStyle = `rgba(100, 160, 255, ${0.3 + Math.random() * 0.4})`;
        ctx.beginPath();
        ctx.arc(
          x + Math.cos(angle) * dist,
          y + Math.sin(angle) * dist,
          1.5,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      checkZones();
    },
    [checkZones]
  );

  /* ── Pointer handlers ── */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!esdaOn) return;
      isDrawing.current = true;
      scratchAt(e.clientX, e.clientY);
    },
    [esdaOn, scratchAt]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!esdaOn || !isDrawing.current) return;
      scratchAt(e.clientX, e.clientY);
    },
    [esdaOn, scratchAt]
  );

  const handlePointerUp = useCallback(() => {
    isDrawing.current = false;
  }, []);

  return (
    <div className="analysis-view">
      <header className="analysis-header" style={{ position: "relative" }}>
        <button className="back-btn" onClick={onBack}>
          ← RETOUR
        </button>
        <div className="header-center">
          <span className="header-dept">POLICE SCIENTIFIQUE</span>
          <span className="header-case">Affaire #2024-0847</span>
        </div>
        <span
          className="evidence-tag"
          style={{ pointerEvents: "none", userSelect: "none", cursor: "default",
            background: "rgba(15,23,42,0.7)", border: "1px solid rgba(96,165,250,0.3)",
            borderRadius: "4px", padding: "2px 8px", fontSize: "0.65rem", color: "#93c5fd" }}
        >
          CARNET DE NAVIGATION
        </span>
      </header>
      <div className="role-banner">RÔLE : INSPECTEUR - Interface d'analyse</div>

      <div className="tools-bar" style={{ position: "relative", zIndex: 10 }}>
        <button
          className={`tool-btn esda ${esdaOn ? "active" : ""}`}
          onClick={() => setEsdaOn(!esdaOn)}
        >
          <span className="tool-icon">{esdaOn ? "⚡" : "◎"}</span>
          <span>ESDA</span>
        </button>
        {esdaOn && (
          <div className="trace-counter">
            <span className="counter-label">LIGNES</span>
            <span className="counter-value">
              {revealed.size}/{TEXT_ZONES.length}
            </span>
          </div>
        )}
        <HelpButton
          title="AIDE - CARNET DE NAVIGATION"
          lines={[
            "Active l'ESDA avec le bouton à gauche.",
            "Frotte la surface du carnet avec ton doigt pour révéler les indentations.",
            "Trouve les 4 lignes cachées pour générer le rapport.",
            "Collecte l'indice une fois le rapport affiché.",
          ]}
        />
      </div>

      {!esdaOn && !showReport && (
        <div className="uv-indicator" style={{ position: "relative", top: "auto", left: "auto", transform: "none", borderLeftColor: "#3b82f6" }}>
          <span className="uv-dot" style={{ background: "#3b82f6", boxShadow: "0 0 6px #3b82f6" }} />
          ACTIVEZ L'ESDA - puis frottez le carnet pour révéler les indentations
        </div>
      )}
      {esdaOn && !allFound && (
        <div className="uv-indicator" style={{ position: "relative", top: "auto", left: "auto", transform: "none", borderLeftColor: "#3b82f6" }}>
          <span className="uv-dot" style={{ background: "#3b82f6", boxShadow: "0 0 6px #3b82f6" }} />
          {revealed.size === 0
            ? "GRATTEZ LA SURFACE POUR REVELER LES INDENTATIONS"
            : `${revealed.size}/${TEXT_ZONES.length} INDENTATIONS REVELEES`}
        </div>
      )}

      <div className="canvas-container">
        <div
          ref={containerRef}
          className={`esda-page-container ${esdaOn ? "esda-active" : ""}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Notebook page background */}
          <div className="esda-page">
            {/* Page lines */}
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="esda-page-line"
                style={{ top: `${10 + i * 7.5}%` }}
              />
            ))}

            {/* Spiral holes */}
            <div className="esda-spiral">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="esda-spiral-hole" />
              ))}
            </div>

            {/* Torn top edge */}
            <div className="esda-torn-edge" />

            {/* Hidden text (visible when zone is scratched enough) */}
            {TEXT_ZONES.map((zone, i) => (
              <div
                key={i}
                className={`esda-hidden-text ${revealed.has(i) ? "revealed" : ""}`}
                style={{
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.w}%`,
                  height: `${zone.h}%`,
                }}
              >
                {zone.text}
              </div>
            ))}
          </div>

          {/* Dark overlay canvas (user scratches this away) */}
          {esdaOn && (
            <canvas
              ref={canvasRef}
              className="esda-overlay-canvas"
              style={{ touchAction: "none" }}
            />
          )}
        </div>
      </div>

      {showReport && (
        <div className="report-overlay">
          <div className="report-card">
            <div className="report-stripe" />
            <div className="report-header">
                <h3>RAPPORT ESDA</h3>
            </div>
            <div className="report-body">
              {TEXT_ZONES.map((zone, i) => (
                <div key={i} className="report-row">
                  <div className="report-row-num">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="report-row-content">
                    <span className="report-row-label">
                      {zone.reportLabel}
                    </span>
                    <span className="report-row-value">
                      {zone.reportValue}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="report-footer">
              <p className="report-instruction">
                CONCLUSION : MESSAGE PLANIFIANT UNE ACTION SUSPECTE
              </p>
              {!isCollected ? (
                <button
                  className="collect-clue-btn"
                  onClick={() => onCollectClue?.()}
                >
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
