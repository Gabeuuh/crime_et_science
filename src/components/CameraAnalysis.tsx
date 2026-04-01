import { useState, useCallback, useEffect, useRef } from "react";

/* ── Crew data for identification ── */
const CREW_DATA = [
  { name: "Cpt. Marc Delaunay", taille: "1m82", carrure: "Forte", cheveux: "Courts, gris" },
  { name: "Léa Fontaine", taille: "1m65", carrure: "Mince", cheveux: "Longs, bruns" },
  { name: "Dr. Thomas Aubert", taille: "1m88", carrure: "Moyenne", cheveux: "Courts, blonds" },
  { name: "Ing. Karim Benzara", taille: "1m75", carrure: "Moyenne", cheveux: "Courts, noirs" },
  { name: "Lt. Sophie Mercier", taille: "1m70", carrure: "Athlétique", cheveux: "Mi-longs, roux" },
];

/* Correct answers */
const CORRECT_SILHOUETTE_1 = 2; // Dr. Thomas Aubert
const CORRECT_SILHOUETTE_2 = 1; // Léa Fontaine

// Replace this path with your actual video file
const VIDEO_SRC = "/video-surveillance.mp4";

type Phase = "viewing" | "quiz1" | "quiz2" | "done";

export default function CameraAnalysis({ onBack }: { onBack: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [phase, setPhase] = useState<Phase>("viewing");
  const [attempts1, setAttempts1] = useState(0);
  const [attempts2, setAttempts2] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<"correct" | "wrong" | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Pan state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* ── Clamp pan so video doesn't go out of bounds ── */
  const clampPan = useCallback(
    (x: number, y: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const maxX = Math.max(0, (rect.width * (zoom - 1)) / 2);
      const maxY = Math.max(0, (rect.height * (zoom - 1)) / 2);
      return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y)),
      };
    },
    [zoom]
  );

  /* ── Video ended → start quiz ── */
  const handleVideoEnd = useCallback(() => {
    setVideoEnded(true);
    if (phase === "viewing") {
      setTimeout(() => setPhase("quiz1"), 1500);
    }
  }, [phase]);

  /* ── Video error or manual skip → start quiz ── */
  const handleVideoError = useCallback(() => {
    setVideoError(true);
  }, []);

  const handleSkipVideo = useCallback(() => {
    if (phase === "viewing") {
      setPhase("quiz1");
    }
  }, [phase]);

  /* ── Zoom ── */
  const cycleZoom = useCallback(() => {
    setZoom((prev) => {
      const next = prev === 1 ? 2 : prev === 2 ? 3 : 1;
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  /* ── Pan handlers ── */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (zoom <= 1) return;
      isPanning.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [zoom]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPanning.current || zoom <= 1) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      setPan((prev) => clampPan(prev.x + dx, prev.y + dy));
    },
    [zoom, clampPan]
  );

  const handlePointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  /* ── Auto-show report ── */
  useEffect(() => {
    if (phase === "done") {
      const timer = setTimeout(() => setShowReport(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  /* ── Reset pan when zoom changes ── */
  useEffect(() => {
    setPan((prev) => clampPan(prev.x, prev.y));
  }, [zoom, clampPan]);

  const handleCrewSelect = useCallback(
    (i: number) => {
      if (quizResult === "correct") return;
      setSelected(i);

      if (phase === "quiz1") {
        const isCorrect = i === CORRECT_SILHOUETTE_1;
        setQuizResult(isCorrect ? "correct" : "wrong");
        if (isCorrect) {
          navigator.vibrate?.(80);
          setTimeout(() => {
            setPhase("quiz2");
            setSelected(null);
            setQuizResult(null);
          }, 1200);
        } else {
          setAttempts1((prev) => prev + 1);
          if (attempts1 >= 1) {
            setTimeout(() => {
              setPhase("quiz2");
              setSelected(null);
              setQuizResult(null);
            }, 1500);
          } else {
            setTimeout(() => {
              setSelected(null);
              setQuizResult(null);
            }, 1200);
          }
        }
      } else if (phase === "quiz2") {
        const isCorrect = i === CORRECT_SILHOUETTE_2;
        setQuizResult(isCorrect ? "correct" : "wrong");
        if (isCorrect) {
          navigator.vibrate?.(80);
          setTimeout(() => setPhase("done"), 1200);
        } else {
          setAttempts2((prev) => prev + 1);
          if (attempts2 >= 1) {
            setTimeout(() => setPhase("done"), 1500);
          } else {
            setTimeout(() => {
              setSelected(null);
              setQuizResult(null);
            }, 1200);
          }
        }
      }
    },
    [phase, quizResult, attempts1, attempts2]
  );

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
        <span className="evidence-tag">INDICE 4 — CAMERA</span>
      </header>

      <div className="canvas-container">
        {/* Video viewer with zoom & pan */}
        <div
          ref={containerRef}
          className="camera-viewer"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ touchAction: zoom > 1 ? "none" : "auto" }}
        >
          <div
            className="camera-video-wrapper"
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            }}
          >
            <video
              ref={videoRef}
              src={VIDEO_SRC}
              className="camera-video"
              controls={phase === "viewing"}
              onEnded={handleVideoEnd}
              onError={handleVideoError}
              playsInline
            />
            {/* Scanlines overlay for surveillance feel */}
            <div className="camera-scanlines" />
          </div>

          {/* Zoom button */}
          <button className="camera-zoom-btn" onClick={cycleZoom}>
            x{zoom}
          </button>

          {/* Timestamp overlay */}
          <div className="camera-timestamp">CAM-03 | PONT 3 — COULOIR</div>

          {zoom > 1 && (
            <div className="camera-pan-hint">
              GLISSEZ POUR DEPLACER LA VUE
            </div>
          )}
        </div>

        {/* Replay button after video ends */}
        {videoEnded && phase === "viewing" && (
          <div className="camera-controls">
            <button
              className="cam-ctrl-btn play"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  videoRef.current.play();
                  setVideoEnded(false);
                }
              }}
            >
              REVOIR
            </button>
          </div>
        )}

        {/* Skip button when video fails to load */}
        {videoError && phase === "viewing" && (
          <div className="camera-controls">
            <div className="camera-error-msg">Fichier vidéo introuvable</div>
            <button className="cam-ctrl-btn play" onClick={handleSkipVideo}>
              PASSER AU QUIZ →
            </button>
          </div>
        )}

        {/* Identification quiz */}
        {(phase === "quiz1" || phase === "quiz2") && (
          <div className="camera-quiz">
            <div className="camera-quiz-header">
              {phase === "quiz1"
                ? "IDENTIFIEZ LA SILHOUETTE 1 (grande, cheveux courts)"
                : "IDENTIFIEZ LA SILHOUETTE 2 (petite, cheveux longs)"}
            </div>
            <div className="camera-quiz-hint">
              Consultez le dossier d'équipage — Tentative{" "}
              {phase === "quiz1" ? attempts1 + 1 : attempts2 + 1}/2
            </div>
            <div className="camera-quiz-options">
              {CREW_DATA.map((crew, i) => (
                <button
                  key={i}
                  className={`camera-quiz-option ${
                    selected === i
                      ? quizResult === "correct"
                        ? "correct"
                        : "wrong"
                      : ""
                  }`}
                  onClick={() => handleCrewSelect(i)}
                  disabled={quizResult === "correct"}
                >
                  <span className="cq-name">{crew.name}</span>
                  <span className="cq-details">
                    {crew.taille} · {crew.carrure} · {crew.cheveux}
                  </span>
                </button>
              ))}
            </div>
            {quizResult === "wrong" && (
              <p className="match-feedback wrong">
                Identification incorrecte — réessayez
              </p>
            )}
            {quizResult === "correct" && (
              <p className="match-feedback correct">
                IDENTIFICATION CONFIRMEE
              </p>
            )}
          </div>
        )}
      </div>

      <div className="tools-bar">
        <div className="trace-counter">
          <span className="counter-label">ZOOM</span>
          <span className="counter-value">x{zoom}</span>
        </div>
      </div>

      {showReport && (
        <div className="report-overlay">
          <div className="report-card">
            <div className="report-stripe" />
            <div className="report-header">
              <div className="report-badge-row">
                <span className="report-badge">CONFIDENTIEL</span>
                <span className="report-badge report-badge-blue">
                  ANALYSE VIDEO
                </span>
              </div>
              <h3>RAPPORT — CAMERA SURVEILLANCE</h3>
              <div className="report-meta">
                <span>Ref. VID-ABYSSE-004</span>
                <span>Piece : Camera couloir pont 3</span>
              </div>
            </div>
            <div className="report-body">
              <div className="report-row">
                <div className="report-row-num">01</div>
                <div className="report-row-content">
                  <span className="report-row-label">Silhouette 1</span>
                  <span className="report-row-value">
                    Dr. Thomas Aubert (1m88, cheveux courts blonds) — a surpris
                    Léa Fontaine dans la salle de navigation
                  </span>
                </div>
              </div>
              <div className="report-row">
                <div className="report-row-num">02</div>
                <div className="report-row-content">
                  <span className="report-row-label">Silhouette 2</span>
                  <span className="report-row-value">
                    Léa Fontaine (1m65, cheveux longs bruns) — confrontée par
                    Aubert, se dirige vers le boîtier d'alarme
                  </span>
                </div>
              </div>
              <div className="report-row">
                <div className="report-row-num">03</div>
                <div className="report-row-content">
                  <span className="report-row-label">Séquence</span>
                  <span className="report-row-value">
                    Confrontation → panique → déclenchement alarme incendie.
                    Le sabotage est un acte impulsif après avoir été découverte.
                  </span>
                </div>
              </div>
            </div>
            <div className="report-footer">
              <p className="report-instruction">
                CONCLUSION : FONTAINE DECOUVERTE PAR AUBERT — ALARME DECLENCHEE
                DANS LA PANIQUE
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
