import { useState, useCallback, useEffect, useRef } from "react";
import videoCameraUrl from "../static/video-camera.mp4";
import HelpButton from "./HelpButton";

/* ── Crew data for identification (4 membres connus) ── */
const CREW_DATA = [
  { name: "Cpt. Marc Delaunay" },
  { name: "Léa Fontaine" },
  { name: "Dr. Thomas Aubert" },
  { name: "Ing. Karim Benzara" },
];

/* Correct answers */
const CORRECT_SILHOUETTE_1 = 2; // Dr. Thomas Aubert
const CORRECT_SILHOUETTE_2 = 1; // Léa Fontaine

const VIDEO_SRC = videoCameraUrl;

type Phase = "viewing" | "quiz1" | "quiz2" | "done";

interface Props {
  onBack: () => void;
  onCollectClue?: () => void;
  isCollected?: boolean;
  onOpenCarnet?: () => void;
}

export default function CameraAnalysis({ onBack, onCollectClue, isCollected, onOpenCarnet }: Props) {
  const [zoom, setZoom] = useState(1);
  const [phase, setPhase] = useState<Phase>("viewing");
  const [attempts1, setAttempts1] = useState(0);
  const [attempts2, setAttempts2] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<"correct" | "wrong" | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [timestamp, setTimestamp] = useState("");
  const [isRewatching, setIsRewatching] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

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

  /* ── Video ended → start quiz or return to quiz ── */
  const handleVideoEnd = useCallback(() => {
    setVideoEnded(true);
    if (phase === "viewing") {
      setTimeout(() => setPhase("quiz1"), 1500);
    } else if (isRewatching) {
      setIsRewatching(false);
    }
  }, [phase, isRewatching]);

  /* ── Video error or manual skip → start quiz ── */
  const handleVideoError = useCallback(() => {
    setVideoError(true);
  }, []);

  const handleSkipVideo = useCallback(() => {
    if (phase === "viewing") {
      setPhase("quiz1");
    }
  }, [phase]);

  const handleRewatch = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsRewatching(true);
    }
  }, []);

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

  /* ── Live timestamp ── */
  useEffect(() => {
    const fmt = () => {
      const now = new Date();
      const d = now.toLocaleDateString("fr-FR").replace(/\//g, "-");
      const t = now.toTimeString().slice(0, 8);
      setTimestamp(`${d}  ${t}`);
    };
    fmt();
    const id = setInterval(fmt, 1000);
    return () => clearInterval(id);
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
        const goToQuiz2 = () => {
          setTransitioning(true);
          setTimeout(() => {
            setPhase("quiz2");
            setSelected(null);
            setQuizResult(null);
            setTransitioning(false);
          }, 900);
        };
        if (isCorrect) {
          navigator.vibrate?.(80);
          setTimeout(goToQuiz2, 1000);
        } else {
          setAttempts1((prev) => prev + 1);
          if (attempts1 >= 1) {
            setTimeout(goToQuiz2, 1200);
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
      <header className="analysis-header" style={{ position: "relative" }}>
        <button className="back-btn" onClick={onBack}>
          ← RETOUR
        </button>
        <div className="header-center">
          <span className="header-dept">ENQUETE SOUS-MARINE</span>
          <span className="header-case">Mission Abysse-7</span>
        </div>
        <span className="evidence-tag">INDICE 4 - CAMERA</span>
        <HelpButton
          title="AIDE - CAMÉRA DE SURVEILLANCE"
          lines={[
            "Regarde attentivement la vidéo de surveillance.",
            "Utilise le bouton x1/x2/x3 pour zoomer sur les silhouettes.",
            "Identifie les deux personnes filmées en te basant sur leur taille et description.",
            "Collecte l'indice une fois le rapport affiché.",
          ]}
        />
      </header>
      <div className="role-banner">RÔLE : INSPECTEUR - Interface d'analyse</div>

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
              controls={false}
              onEnded={handleVideoEnd}
              onError={handleVideoError}
              playsInline
              autoPlay
            />
            {/* Surveillance overlays */}
            <div className="camera-scanlines" />
            <div className="camera-noise" />
            <div className="camera-vignette" />
          </div>

          {/* REC indicator */}
          <div className="camera-rec"><span className="camera-rec-dot" />REC</div>

          {/* Zoom button */}
          <button className="camera-zoom-btn" onClick={cycleZoom}>
            x{zoom}
          </button>

          {/* Timestamp overlay */}
          <div className="camera-timestamp">
            <span>CAM-03 | PONT 3 - COULOIR</span>
            <span>{timestamp}</span>
          </div>

          {zoom > 1 && (
            <div className="camera-pan-hint">
              GLISSEZ POUR DEPLACER LA VUE
            </div>
          )}

          {/* Return-to-quiz button while rewatching */}
          {isRewatching && (
            <button
              className="camera-return-quiz-btn"
              onClick={() => setIsRewatching(false)}
            >
              RETOUR AU QUIZ →
            </button>
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

        {/* Transition entre les deux questions */}
        {transitioning && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(8,15,26,0.92)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            zIndex: 20, gap: "12px"
          }}>
            <div style={{ fontSize: "2rem" }}>📹</div>
            <div style={{ color: "#60a5fa", fontFamily: "Courier New, monospace", fontSize: "0.9rem", letterSpacing: "0.1em" }}>
              ANALYSE SUIVANTE...
            </div>
            <div style={{ color: "#475569", fontSize: "0.75rem", fontFamily: "Courier New, monospace" }}>
              IDENTIFIEZ LA DEUXIÈME SILHOUETTE
            </div>
          </div>
        )}

        {/* Identification quiz */}
        {(phase === "quiz1" || phase === "quiz2") && !isRewatching && !transitioning && (
          <div className="camera-quiz">
            <div className="camera-quiz-top-row">
              <div className="camera-quiz-header">
                {phase === "quiz1"
                  ? "IDENTIFIEZ LA SILHOUETTE À DROITE"
                  : "IDENTIFIEZ LA SILHOUETTE À GAUCHE"}
              </div>
              <button className="camera-rewatch-btn" onClick={handleRewatch}>
                ▶ REVOIR
              </button>
            </div>
            <div className="camera-quiz-hint">
              Consultez le dossier d'équipage - Tentative{" "}
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
                  style={{ color: "#1e293b" }}
                >
                  <span className="cq-name" style={{ color: "#0f172a", fontWeight: 700 }}>{crew.name}</span>
                </button>
              ))}
            </div>
            {quizResult === "wrong" && (
              <p className="match-feedback wrong">
                Identification incorrecte - réessayez
              </p>
            )}
            {quizResult === "correct" && (
              <p className="match-feedback correct">
                IDENTIFICATION CONFIRMÉE
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
              <h3>RAPPORT - CAMÉRA SURVEILLANCE</h3>
            </div>
            <div className="report-body">
              <div className="report-row">
                <div className="report-row-num">01</div>
                <div className="report-row-content">
                  <span className="report-row-label">Silhouette 1</span>
                  <span className="report-row-value">
                    Dr. Thomas Aubert (1m88, cheveux courts blonds) - a surpris
                    Léa Fontaine dans la salle de navigation
                  </span>
                </div>
              </div>
              <div className="report-row">
                <div className="report-row-num">02</div>
                <div className="report-row-content">
                  <span className="report-row-label">Silhouette 2</span>
                  <span className="report-row-value">
                    Léa Fontaine (1m65, cheveux longs bruns) - confrontée par
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
                CONCLUSION : FONTAINE DECOUVERTE PAR AUBERT - ALARME DECLENCHEE
                DANS LA PANIQUE
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
