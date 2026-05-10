import { useState, useEffect, useRef, useCallback } from "react";
import "@tensorflow/tfjs";
import * as tmImage from "@teachablemachine/image";
import HelpButton from "./HelpButton";

const MODEL_URL = "/model/tm-my-image-model/";

interface TargetObject {
  id: string;
  name: string;
  icon: string;
}

/* Map Teachable Machine labels → analysis IDs */
const LABEL_MAP: Record<string, TargetObject> = {
  "alarme-incendie": { id: "alarme",     name: "Alarme incendie",      icon: "🚨" },
  "cassette":        { id: "dictaphone", name: "Cassette",              icon: "🎙️" },
  "disque-dur":      { id: "usb",        name: "Disque dur",            icon: "🔑" },
  "camera":          { id: "camera",     name: "Caméra surveillance",   icon: "📹" },
  "carnet":          { id: "carnet",     name: "Carnet",                icon: "📓" },
};

const CONFIDENCE_THRESHOLD = 0.65;

interface DetectionResult {
  targetObject: TargetObject | null;
  confidence: number;
  rawLabel: string;
}

type ScanState = "loading" | "idle" | "scanning" | "found";

interface Props {
  onAnalyze: (objectId: string) => void;
}

export default function ScanView({ onAnalyze }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [model, setModel] = useState<tmImage.CustomMobileNet | null>(null);
  const [scanState, setScanState] = useState<ScanState>("loading");
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load Teachable Machine model
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      tmImage.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json"),
    ])
      .then(([m]) => {
        if (!cancelled) {
          setModel(m);
          setScanState("idle");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Erreur chargement du modèle IA.");
      });
    return () => { cancelled = true; };
  }, []);

  // Start camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch {
          setError("Impossible d'accéder à la caméra.");
          return;
        }
      }
      if (videoRef.current) videoRef.current.srcObject = stream;
    };
    start();
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  // Animated progress counter during scan
  useEffect(() => {
    if (scanState !== "scanning") return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = p + Math.floor(Math.random() * 4) + 1;
        return next >= 99 ? 99 : next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [scanState]);

  const scan = useCallback(async () => {
    if (!model || !videoRef.current || scanState !== "idle") return;

    setScanState("scanning");
    setResult(null);

    const minDelay = new Promise((r) => setTimeout(r, 2500));

    try {
      const [predictions] = await Promise.all([
        model.predict(videoRef.current),
        minDelay,
      ]);

      // Find best prediction
      const best = predictions.reduce((a, b) =>
        a.probability > b.probability ? a : b
      );

      const target = LABEL_MAP[best.className] ?? null;
      const detection: DetectionResult = {
        targetObject: best.probability >= CONFIDENCE_THRESHOLD ? target : null,
        confidence: best.probability,
        rawLabel: best.className,
      };

      setProgress(100);
      await new Promise((r) => setTimeout(r, 400));
      setResult(detection);
      setScanState("found");
    } catch {
      setError("Erreur lors de l'analyse.");
    }
  }, [model, scanState]);

  const reset = () => {
    setScanState("idle");
    setResult(null);
    setProgress(0);
  };

  if (error) {
    return (
      <div className="scan-view error-screen">
        <div className="error-content">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Réessayer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="scan-view">
      <video ref={videoRef} autoPlay playsInline muted className="camera-feed" />

      {/* Header */}
      <div className="role-banner">RÔLE : INSPECTEUR — Interface d'analyse</div>
      <header className="header" style={{ position: "relative" }}>
        <h1>🔍 INSPECTEUR</h1>
        <p className="subtitle">Pointe la caméra vers un objet et appuie sur SCANNER</p>
        <HelpButton
          title="AIDE — SCANNER"
          lines={[
            "Pointe la caméra vers un objet physique récupéré par le joueur VR.",
            "Appuie sur SCANNER pour que l'IA identifie l'objet.",
            "Une fois identifié, appuie sur ANALYSER L'INDICE.",
            "Consulte le CARNET en bas de l'écran pour suivre ta progression.",
          ]}
        />
      </header>

      {/* Scan frame + animation */}
      <div className="scan-overlay">
        <div className={`scan-frame ${scanState === "scanning" ? "active" : ""}`}>
          {scanState === "scanning" && <div className="scan-line" />}
          <div className="corner tl" />
          <div className="corner tr" />
          <div className="corner bl" />
          <div className="corner br" />
        </div>
      </div>

      {/* Scan HUD data */}
      {scanState === "scanning" && (
        <div className="scan-hud">
          <div className="hud-status">ANALYSE EN COURS</div>
          <div className="hud-progress">{progress}%</div>
          <div className="hud-bar">
            <div className="hud-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="hud-details">
            <span>RÉS. OPTIQUE: 1280×720</span>
            <span>MODÈLE: Custom TM v2</span>
          </div>
        </div>
      )}

      {/* Result panel */}
      {scanState === "found" && result && (
        <div className={`result-panel ${result.targetObject ? "found" : "unknown"}`}>
          {result.targetObject ? (
            <>
              <span className="result-icon">{result.targetObject.icon}</span>
              <div className="result-stamp">IDENTIFIÉ</div>
              <h2>{result.targetObject.name}</h2>
              <div className="confidence-bar">
                <div
                  className="confidence-fill"
                  style={{ width: `${Math.round(result.confidence * 100)}%` }}
                />
              </div>
              <p className="confidence-text">
                Confiance : {Math.round(result.confidence * 100)}%
              </p>
              <button className="analyze-btn" onClick={() => onAnalyze(result.targetObject!.id)}>
                🔬 Analyser l'indice
              </button>
              <button className="retry-btn" onClick={reset}>
                Nouveau scan
              </button>
            </>
          ) : (
            <>
              <span className="result-icon">❓</span>
              <h2>Objet non identifié</h2>
              <p className="raw-label">Détecté : {result.rawLabel} ({Math.round(result.confidence * 100)}%)</p>
              <button className="retry-btn" onClick={reset}>
                Réessayer
              </button>
            </>
          )}
        </div>
      )}

      {/* Scan button */}
      {(scanState === "idle" || scanState === "loading") && (
        <button
          className={`scan-button ${scanState === "loading" ? "loading-btn" : ""}`}
          onClick={scan}
          disabled={scanState === "loading"}
        >
          <span className="scan-button-inner">
            {scanState === "loading" ? "Chargement IA..." : "SCANNER"}
          </span>
        </button>
      )}
    </div>
  );
}
