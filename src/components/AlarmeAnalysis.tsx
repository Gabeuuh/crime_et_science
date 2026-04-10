import { useState, useCallback, useEffect, useRef } from "react";
import empreinteImg from "../static/empreinte-detoure.png";

/* ── Crew fingerprints for matching ── */
const CREW_MEMBERS = [
  {
    name: "Cpt. Marc Delaunay",
    pattern: "Boucle ulnaire droite - 14 minuties",
    match: false,
  },
  {
    name: "Léa Fontaine",
    pattern: "Verticille double - 11 minuties",
    match: true,
  },
  {
    name: "Dr. Thomas Aubert",
    pattern: "Arc tente - 9 minuties",
    match: false,
  },
  {
    name: "Ing. Karim Benzara",
    pattern: "Boucle radiale gauche - 13 minuties",
    match: false,
  },
  {
    name: "Lt. Sophie Mercier",
    pattern: "Verticille simple - 10 minuties",
    match: false,
  },
];

const REVEAL_RADIUS = 22;
const REVEAL_THRESHOLD = 0.55;

type Phase = "sweep" | "match" | "done";

interface Props {
  onBack: () => void;
  onCollectClue?: () => void;
  isCollected?: boolean;
}

export default function AlarmeAnalysis({ onBack, onCollectClue, isCollected }: Props) {
  const [uvOn, setUvOn] = useState(false);
  const [fingerprintRevealed, setFingerprintRevealed] = useState(false);
  const [phase, setPhase] = useState<Phase>("sweep");
  const [selectedCrew, setSelectedCrew] = useState<number | null>(null);
  const [matchResult, setMatchResult] = useState<"correct" | "wrong" | null>(
    null
  );
  const [showReport, setShowReport] = useState(false);
  const [sweepProgress, setSweepProgress] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const MAX_ATTEMPTS = 2;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fpAreaRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const fpImageRef = useRef<HTMLImageElement | null>(null);

  /* ── Preload fingerprint image ── */
  useEffect(() => {
    const img = new Image();
    img.src = empreinteImg;
    fpImageRef.current = img;
  }, []);

  /* ── Initialize canvases ── */
  useEffect(() => {
    if (!uvOn || phase !== "sweep") return;
    const canvas = canvasRef.current;
    const area = fpAreaRef.current;
    if (!canvas || !area) return;

    const rect = area.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Create offscreen mask canvas
    const mask = document.createElement("canvas");
    mask.width = rect.width;
    mask.height = rect.height;
    maskRef.current = mask;
  }, [uvOn, phase]);

  /* ── Draw fingerprint lines only where user has swept ── */
  const drawFingerprint = useCallback(
    (x: number, y: number) => {
      const canvas = canvasRef.current;
      const mask = maskRef.current;
      if (!canvas || !mask) return;
      const ctx = canvas.getContext("2d");
      const maskCtx = mask.getContext("2d");
      if (!ctx || !maskCtx) return;

      const w = canvas.width;
      const h = canvas.height;
      // Fingerprint centered on the manual trigger button (lower-center of the box)
      const cx = w * 0.5;
      const cy = h * 0.58;

      // Paint on the mask
      maskCtx.fillStyle = "white";
      maskCtx.beginPath();
      maskCtx.arc(x, y, REVEAL_RADIUS, 0, Math.PI * 2);
      maskCtx.fill();

      // Clear and redraw fingerprint using mask
      ctx.clearRect(0, 0, w, h);

      // Draw fingerprint image clipped by mask
      ctx.save();

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = w;
      tempCanvas.height = h;
      const tempCtx = tempCanvas.getContext("2d")!;

      // Draw the fingerprint image centered at cx, cy - preserve aspect ratio
      const img = fpImageRef.current;
      if (img) {
        const MAX = 100; // max dimension in px
        const ratio = img.naturalWidth / img.naturalHeight;
        const FP_W = ratio >= 1 ? MAX : MAX * ratio;
        const FP_H = ratio >= 1 ? MAX / ratio : MAX;
        tempCtx.drawImage(img, cx - FP_W / 2, cy - FP_H / 2, FP_W, FP_H);
      }

      // Show image only where mask is painted
      ctx.drawImage(mask, 0, 0);
      ctx.globalCompositeOperation = "source-in";
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.globalCompositeOperation = "source-over";

      // Add UV glow around sweep area
      ctx.fillStyle = "rgba(124, 58, 237, 0.08)";
      ctx.beginPath();
      ctx.arc(x, y, REVEAL_RADIUS + 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Calculate coverage - only within the fingerprint bounding zone
      const FP_ZONE = 56; // radius around fingerprint center to measure
      const zx = Math.max(0, Math.round(cx - FP_ZONE));
      const zy = Math.max(0, Math.round(cy - FP_ZONE));
      const zw = Math.min(w - zx, FP_ZONE * 2);
      const zh = Math.min(h - zy, FP_ZONE * 2);
      const maskData = maskCtx.getImageData(zx, zy, zw, zh);
      let painted = 0;
      const total = zw * zh;
      for (let p = 3; p < maskData.data.length; p += 4) {
        if (maskData.data[p] > 128) painted++;
      }
      const progress = Math.min(
        (painted / total / REVEAL_THRESHOLD) * 100,
        100
      );
      setSweepProgress(progress);

      if (painted / total > REVEAL_THRESHOLD && !fingerprintRevealed) {
        setFingerprintRevealed(true);
        navigator.vibrate?.(120);
      }
    },
    [fingerprintRevealed, fpImageRef]
  );

  /* ── Pointer handlers ── */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!uvOn || phase !== "sweep") return;
      isDrawing.current = true;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      drawFingerprint(e.clientX - rect.left, e.clientY - rect.top);
    },
    [uvOn, phase, drawFingerprint]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!uvOn || phase !== "sweep" || !isDrawing.current) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      drawFingerprint(e.clientX - rect.left, e.clientY - rect.top);
    },
    [uvOn, phase, drawFingerprint]
  );

  const handlePointerUp = useCallback(() => {
    isDrawing.current = false;
  }, []);

  /* ── Handle crew member selection ── */
  const handleCrewSelect = useCallback(
    (i: number) => {
      if (matchResult === "correct") return;
      setSelectedCrew(i);
      const isCorrect = CREW_MEMBERS[i].match;
      setMatchResult(isCorrect ? "correct" : "wrong");

      if (isCorrect) {
        navigator.vibrate?.(80);
        setTimeout(() => setPhase("done"), 1000);
      } else {
        const newWrong = wrongAttempts + 1;
        setWrongAttempts(newWrong);
        if (newWrong >= MAX_ATTEMPTS) {
          // Force advance after max wrong attempts
          setTimeout(() => setPhase("done"), 1800);
        } else {
          setTimeout(() => {
            setSelectedCrew(null);
            setMatchResult(null);
          }, 1200);
        }
      }
    },
    [matchResult, wrongAttempts]
  );

  /* ── Auto-show report ── */
  useEffect(() => {
    if (phase === "done") {
      const timer = setTimeout(() => setShowReport(true), 800);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  return (
    <div className="analysis-view">
      <header className="analysis-header">
        <button className="back-btn" onClick={onBack}>
          ← RETOUR
        </button>
        <div className="header-center">
          <span className="header-dept">ENQUETE SOUS-MARINE</span>
          <span className="header-case">Mission Abysse-7</span>
        </div>
        <span className="evidence-tag">INDICE 2 - ALARME INCENDIE</span>
      </header>

      <div className="canvas-container">
        <div
          className={`alarme-scene ${uvOn ? "uv-active" : ""}`}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Wall background */}
          <div className="alarme-wall" />

          {/* Alarm box */}
          <div className="alarme-box">
            <div className="alarme-box-lid" />
            <div className="alarme-label">ALARME INCENDIE</div>
            <div className="alarme-label-sub">DÉCLENCHEMENT MANUEL</div>

            {/* Manual trigger button */}
            <div className="alarme-trigger">
              <div className="alarme-trigger-btn" />
              <div className="alarme-trigger-text">APPUYER</div>
            </div>

            {/* LED indicator */}
            <div className={`alarme-led ${uvOn ? "active" : ""}`} />

            {/* Fingerprint canvas - revealed progressively by sweep */}
            {uvOn && (
              <div
                ref={fpAreaRef}
                className="alarme-fingerprint-zone"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                style={{ touchAction: "none" }}
              >
                <canvas ref={canvasRef} className="alarme-fp-canvas" />
                {fingerprintRevealed && (
                  <span className="alarme-fp-badge">EMPREINTE DETECTEE</span>
                )}
              </div>
            )}

            {/* UV sweep glow effect */}
            {uvOn && phase === "sweep" && (
              <div className="alarme-uv-glow" />
            )}
          </div>

          {/* Wires */}
          <div className="alarme-wire alarme-wire-1" />
          <div className="alarme-wire alarme-wire-2" />
        </div>

        {/* ── Fingerprint zoom overlay ── */}
        {fingerprintRevealed && phase === "sweep" && (
          <div className="fp-zoom-overlay">
            <div className="fp-zoom-card">
              <div className="fp-zoom-label">EMPREINTE RELEVÉE</div>
              <img src={empreinteImg} className="fp-zoom-img" alt="empreinte digitale" />
              <p className="fp-zoom-hint">Comparez avec les dossiers d'équipage</p>
              <button className="fp-zoom-btn" onClick={() => setPhase("match")}>
                IDENTIFIER →
              </button>
            </div>
          </div>
        )}

        {/* ── Fingerprint matching panel ── */}
        {phase === "match" && (
          <div className="match-panel">
            <div className="match-header">
              <span className="match-title">IDENTIFICATION D'EMPREINTE</span>
              <span className="match-subtitle">
                Comparez l'empreinte révélée avec les dossiers d'équipage
              </span>
              {wrongAttempts > 0 && matchResult !== "correct" && (
                <span className="match-attempts-left">
                  {MAX_ATTEMPTS - wrongAttempts} tentative{MAX_ATTEMPTS - wrongAttempts > 1 ? "s" : ""} restante{MAX_ATTEMPTS - wrongAttempts > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="match-list">
              {CREW_MEMBERS.map((crew, i) => (
                <button
                  key={i}
                  className={`match-option ${
                    selectedCrew === i
                      ? matchResult === "correct"
                        ? "correct"
                        : "wrong"
                      : ""
                  }`}
                  onClick={() => handleCrewSelect(i)}
                  disabled={matchResult === "correct"}
                >
                  <span className="match-name">{crew.name}</span>
                  <span className="match-pattern">{crew.pattern}</span>
                </button>
              ))}
            </div>
            {matchResult === "wrong" && (
              <p className="match-feedback wrong">
                Empreinte non concordante - réessayez
              </p>
            )}
            {matchResult === "correct" && (
              <p className="match-feedback correct">
                CONCORDANCE CONFIRMEE - Léa Fontaine
              </p>
            )}
          </div>
        )}
      </div>

      <div className="tools-bar">
        <button
          className={`tool-btn ${uvOn ? "active" : ""}`}
          onClick={() => setUvOn(!uvOn)}
          disabled={phase === "match"}
        >
          <span className="tool-icon">{uvOn ? "◉" : "◎"}</span>
          <span>LUMIERE UV</span>
        </button>
        {uvOn && phase === "sweep" && (
          <div className="trace-counter">
            <span className="counter-label">REVELATION</span>
            <span className="counter-value">
              {Math.round(sweepProgress)}%
            </span>
          </div>
        )}
      </div>

      {uvOn && phase === "sweep" && !fingerprintRevealed && (
        <div className="uv-indicator">
          <span className="uv-dot" />
          BALAYEZ LE DECLENCHEUR AVEC VOTRE DOIGT
        </div>
      )}

      {!uvOn && phase === "sweep" && (
        <div className="instructions">
          ACTIVEZ LA LUMIERE UV POUR REVELER LES EMPREINTES
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
                  LABO. EMPREINTES
                </span>
              </div>
              <h3>RAPPORT D'EMPREINTES</h3>
              <div className="report-meta">
                <span>Ref. EMP-ABYSSE-002</span>
                <span>Piece : Boîtier alarme incendie</span>
              </div>
            </div>
            <div className="report-body">
              <div className="report-row">
                <div className="report-row-num">01</div>
                <div className="report-row-content">
                  <span className="report-row-label">
                    Empreinte sur le déclencheur manuel
                  </span>
                  <span className="report-row-value">
                    Verticille double - 11 minuties. Concordance : Léa Fontaine
                    (technicienne de navigation)
                  </span>
                </div>
              </div>
              <div className="report-row">
                <div className="report-row-num">02</div>
                <div className="report-row-content">
                  <span className="report-row-label">
                    Mode de déclenchement
                  </span>
                  <span className="report-row-value">
                    Alarme déclenchée manuellement - aucun capteur de fumée n'a
                    détecté d'incendie avant l'activation
                  </span>
                </div>
              </div>
              <div className="report-row">
                <div className="report-row-num">03</div>
                <div className="report-row-content">
                  <span className="report-row-label">Conclusion</span>
                  <span className="report-row-value">
                    L'évacuation a été provoquée intentionnellement par Léa
                    Fontaine. Pas d'incendie réel.
                  </span>
                </div>
              </div>
            </div>
            <div className="report-footer">
              <p className="report-instruction">
                CONCLUSION : FAUSSE ALARME DECLENCHEE PAR LEA FONTAINE
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
                  <button
                    className="report-close-btn"
                    onClick={() => setShowReport(false)}
                  >
                    FERMER LE RAPPORT
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
