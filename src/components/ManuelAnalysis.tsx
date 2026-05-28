import { useState, useRef, useCallback, useEffect } from "react";
import HelpButton from "./HelpButton";

/* ── Hidden notes (invisible ink on the submarine manual page) ── */
const NOTES = [
  {
    x: 10,
    y: 12,
    w: 80,
    h: 8,
    text: "Capsules de secours activées - protocole ECHO-7",
    reportLabel: "Note manuscrite ligne 1",
    reportValue:
      '"Capsules de secours activées - protocole ECHO-7" - écriture rapide, encre réactive aux UV',
  },
  {
    x: 10,
    y: 30,
    w: 65,
    h: 8,
    text: "Évacuation déclenchée à 03h47",
    reportLabel: "Note manuscrite ligne 2",
    reportValue:
      '"Évacuation déclenchée à 03h47" - même écriture, pression forte sur le stylo',
  },
  {
    x: 10,
    y: 48,
    w: 72,
    h: 8,
    text: "Aucun incendie détecté par les capteurs",
    reportLabel: "Note manuscrite ligne 3",
    reportValue:
      '"Aucun incendie détecté par les capteurs" - souligné deux fois, encre différente',
  },
  {
    x: 10,
    y: 66,
    w: 60,
    h: 8,
    text: "Vérifier le boîtier d'alarme",
    reportLabel: "Note manuscrite ligne 4",
    reportValue:
      '"Vérifier le boîtier d\'alarme" - ajouté en marge, écriture hésitante',
  },
];

const SCRATCH_RADIUS = 20;
const REVEAL_THRESHOLD = 0.6;

interface Props {
  onBack: () => void;
  onCollectClue?: () => void;
  isCollected?: boolean;
  onOpenCarnet?: () => void;
}

export default function ManuelAnalysis({ onBack, onCollectClue, isCollected, onOpenCarnet }: Props) {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [heatOn, setHeatOn] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [showReport, setShowReport] = useState(false);
  const isDrawing = useRef(false);
  const allFound = revealed.size === NOTES.length;

  /* ── Initialize overlay canvases (one per note zone) ── */
  useEffect(() => {
    if (!heatOn) return;
    const container = containerRef.current;
    if (!container) return;

    NOTES.forEach((_note, i) => {
      const canvas = canvasRefs.current[i];
      if (!canvas) return;
      const noteEl = canvas.parentElement;
      if (!noteEl) return;

      const w = noteEl.offsetWidth;
      const h = noteEl.offsetHeight;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // Fill with page-colored overlay to hide the note text
      ctx.fillStyle = "#f5f0e0";
      ctx.fillRect(0, 0, w, h);

      // Paper texture grain
      for (let j = 0; j < 200; j++) {
        ctx.fillStyle = `rgba(180, 160, 120, ${Math.random() * 0.25})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }
    });
  }, [heatOn]);

  /* ── Auto-show report ── */
  useEffect(() => {
    if (allFound && heatOn) {
      const timer = setTimeout(() => setShowReport(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [allFound, heatOn]);

  /* ── Check coverage for a specific note zone ── */
  const checkZone = useCallback(
    (i: number) => {
      if (revealed.has(i)) return;
      const canvas = canvasRefs.current[i];
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let cleared = 0;
      const total = canvas.width * canvas.height;
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
    },
    [revealed]
  );

  /* ── Scratch (heat) at position on a specific note canvas ── */
  const scratchAt = useCallback(
    (noteIndex: number, clientX: number, clientY: number) => {
      const canvas = canvasRefs.current[noteIndex];
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, SCRATCH_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      // Heat shimmer particles
      for (let s = 0; s < 3; s++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = SCRATCH_RADIUS + Math.random() * 10;
        ctx.fillStyle = `rgba(255, 160, 50, ${0.2 + Math.random() * 0.3})`;
        ctx.beginPath();
        ctx.arc(
          x + Math.cos(angle) * dist,
          y + Math.sin(angle) * dist,
          2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      checkZone(noteIndex);
    },
    [checkZone]
  );

  /* ── Pointer handlers for each note zone ── */
  const activeNote = useRef<number | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, noteIndex: number) => {
      if (!heatOn || revealed.has(noteIndex)) return;
      isDrawing.current = true;
      activeNote.current = noteIndex;
      scratchAt(noteIndex, e.clientX, e.clientY);
    },
    [heatOn, revealed, scratchAt]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent, noteIndex: number) => {
      if (!heatOn || !isDrawing.current || activeNote.current !== noteIndex)
        return;
      scratchAt(noteIndex, e.clientX, e.clientY);
    },
    [heatOn, scratchAt]
  );

  const handlePointerUp = useCallback(() => {
    isDrawing.current = false;
    activeNote.current = null;
  }, []);

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
        <span
          className="evidence-tag"
          style={{ pointerEvents: "none", userSelect: "none", cursor: "default",
            background: "rgba(15,23,42,0.7)", border: "1px solid rgba(96,165,250,0.3)",
            borderRadius: "4px", padding: "2px 8px", fontSize: "0.65rem", color: "#93c5fd" }}
        >
          INDICE 1 - MANUEL
        </span>
      </header>
      <div className="role-banner">RÔLE : INSPECTEUR - Interface d'analyse</div>

      <div className="tools-bar" style={{ position: "relative", zIndex: 10 }}>
        <button
          className={`tool-btn heat ${heatOn ? "active" : ""}`}
          onClick={() => setHeatOn(!heatOn)}
        >
          <span className="tool-icon">{heatOn ? "🔥" : "◎"}</span>
          <span>CHALEUR</span>
        </button>
        {heatOn && (
          <div className="trace-counter">
            <span className="counter-label">NOTES</span>
            <span className="counter-value">
              {revealed.size}/{NOTES.length}
            </span>
          </div>
        )}
        <HelpButton
          title="AIDE - MANUEL DE BORD"
          lines={[
            "Active la CHALEUR avec le bouton à gauche.",
            "Frotte les zones du manuel avec ton doigt pour révéler l'encre invisible.",
            "Trouve les 4 notes cachées pour générer le rapport.",
            "Collecte l'indice une fois le rapport affiché.",
          ]}
        />
      </div>

      {!heatOn && !showReport && (
        <div className="uv-indicator" style={{ position: "relative", top: "auto", left: "auto", transform: "none", borderLeftColor: "#f97316" }}>
          <span className="uv-dot" style={{ background: "#f97316", boxShadow: "0 0 6px #f97316" }} />
          ACTIVEZ LA CHALEUR - puis frottez le manuel pour révéler l'encre invisible
        </div>
      )}
      {heatOn && !allFound && (
        <div className="uv-indicator" style={{ position: "relative", top: "auto", left: "auto", transform: "none", borderLeftColor: "#f97316" }}>
          <span className="uv-dot" style={{ background: "#f97316", boxShadow: "0 0 6px #f97316" }} />
          {revealed.size === 0
            ? "CHAUFFEZ LES ZONES POUR REVELER L'ENCRE INVISIBLE"
            : `${revealed.size}/${NOTES.length} NOTES REVELEES`}
        </div>
      )}

      <div className="canvas-container">
        <div
          ref={containerRef}
          className={`manuel-page-container ${heatOn ? "heat-active" : ""}`}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Manual page background */}
          <div className="manuel-page">
            {/* Printed title */}
            <div className="manuel-title">MANUEL DE BORD - U.S.S. ABYSSE</div>
            <div className="manuel-subtitle">
              Section 12 : Procédure d'évacuation d'urgence
            </div>

            {/* Content interleaved: note zone then paragraph */}
            <div className="manuel-content">
              {[0, 1, 2, 3].map((i) => {
                const paragraphs = [
                  "12.1 - Les capsules de secours (modèle KR-400) sont situées aux ponts 2 et 4.",
                  "12.2 - En cas d'alarme incendie, l'évacuation est automatique sous 180 secondes.",
                  "12.3 - Le déclenchement manuel nécessite l'ouverture du boîtier rouge (pont 3).",
                  "12.4 - Chaque capsule peut accueillir 4 membres d'équipage.",
                ];
                const noteStyles: React.CSSProperties[] = [
                  { marginLeft: "3%",  width: "60%", transform: "rotate(-3deg)",  fontSize: "0.95em", marginBottom: "6px" },
                  { marginLeft: "22%", width: "55%", transform: "rotate(2.5deg)", fontSize: "0.85em", marginTop: "4px" },
                  { marginLeft: "8%",  width: "70%", transform: "rotate(-1.8deg)",fontSize: "1.05em", marginBottom: "2px" },
                  { marginLeft: "30%", width: "50%", transform: "rotate(4deg)",   fontSize: "0.8em",  marginTop: "8px" },
                ];
                return (
                  <div key={i} className="manuel-section">
                    <div
                      className={`manuel-hidden-note ${revealed.has(i) ? "revealed" : ""}`}
                      style={noteStyles[i]}
                      onPointerDown={(e) => handlePointerDown(e, i)}
                      onPointerMove={(e) => handlePointerMove(e, i)}
                    >
                      <span className="manuel-note-text">{NOTES[i].text}</span>
                      {heatOn && !revealed.has(i) && (
                        <canvas
                          ref={(el) => { canvasRefs.current[i] = el; }}
                          className="manuel-note-canvas"
                          style={{ touchAction: "none" }}
                        />
                      )}
                    </div>
                    <p className="manuel-printed-line">{paragraphs[i]}</p>
                  </div>
                );
              })}
            </div>

            {/* Diagram placeholder */}
            <div className="manuel-diagram">
              <div className="manuel-diagram-label">SCHEMA KR-400</div>
              <div className="manuel-diagram-box">
                <div className="manuel-capsule" />
                <div className="manuel-capsule" />
                <div className="manuel-capsule" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showReport && (
        <div className="report-overlay">
          <div className="report-card">
            <div className="report-stripe" />
            <div className="report-header">
              <h3>RAPPORT - MANUEL DE BORD</h3>
            </div>
            <div className="report-body">
              {NOTES.map((note, i) => (
                <div key={i} className="report-row">
                  <div className="report-row-num">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="report-row-content">
                    <span className="report-row-label">{note.reportLabel}</span>
                    <span className="report-row-value">{note.reportValue}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="report-footer">
              <p className="report-instruction">
                CONCLUSION : L'ÉQUIPAGE A ÉVACUÉ PAR LES CAPSULES DE SECOURS
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
                    <button className="report-close-btn" style={{ background: "rgba(30,58,95,0.8)", borderColor: "rgba(96,165,250,0.5)", color: "#93c5fd" }} onClick={onOpenCarnet}>
                      📓 CONSULTER LE CARNET
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
