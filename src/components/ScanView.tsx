import { useState, useEffect, useRef, useCallback } from "react";
import "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";

interface TargetObject {
  id: string;
  name: string;
  icon: string;
  keywords: string[];
}

const TARGET_OBJECTS: TargetObject[] = [
  {
    id: "passeport",
    name: "Passeport",
    icon: "🛂",
    keywords: ["envelope", "wallet", "book jacket", "binder", "id card"],
  },
  {
    id: "tasse",
    name: "Tasse de café",
    icon: "☕",
    keywords: ["coffee mug", "cup", "espresso", "mug", "pitcher"],
  },
  {
    id: "carnet",
    name: "Carnet",
    icon: "📓",
    keywords: ["notebook", "book", "diary", "binder", "menu", "packet"],
  },
  {
    id: "photo",
    name: "Photo",
    icon: "📷",
    keywords: ["picture frame", "jigsaw puzzle", "comic book", "album"],
  },
  {
    id: "somniferes",
    name: "Somnifères",
    icon: "💊",
    keywords: ["pill bottle", "medicine chest", "bottlecap", "medicine", "vial", "pop bottle"],
  },
  {
    id: "serrure",
    name: "Serrure",
    icon: "🔒",
    keywords: ["padlock", "combination lock", "safe", "lock", "buckle"],
  },
];

interface DetectionResult {
  targetObject: TargetObject | null;
  confidence: number;
  rawPrediction: string;
}

function matchToTarget(
  predictions: Array<{ className: string; probability: number }>
): DetectionResult {
  for (const pred of predictions) {
    const classLower = pred.className.toLowerCase();
    for (const target of TARGET_OBJECTS) {
      for (const keyword of target.keywords) {
        if (classLower.includes(keyword)) {
          return {
            targetObject: target,
            confidence: pred.probability,
            rawPrediction: pred.className,
          };
        }
      }
    }
  }
  return {
    targetObject: null,
    confidence: predictions[0]?.probability ?? 0,
    rawPrediction: predictions[0]?.className ?? "inconnu",
  };
}

type ScanState = "loading" | "idle" | "scanning" | "found";

interface Props {
  onAnalyze: () => void;
}

export default function ScanView({ onAnalyze }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [model, setModel] = useState<mobilenet.MobileNet | null>(null);
  const [scanState, setScanState] = useState<ScanState>("loading");
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load MobileNet model
  useEffect(() => {
    let cancelled = false;
    mobilenet
      .load({ version: 2, alpha: 1.0 })
      .then((m) => {
        if (!cancelled) {
          setModel(m);
          setScanState("idle");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Erreur chargement du modèle IA.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Start camera
  useEffect(() => {
    let stream: MediaStream | null = null;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
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
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
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
    const classifyPromise = model.classify(videoRef.current, 5);

    try {
      const [predictions] = await Promise.all([classifyPromise, minDelay]);
      const detection = matchToTarget(predictions);
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
      <header className="header">
        <h1>🔍 INSPECTEUR</h1>
        <p className="subtitle">Scanner les indices de la scène de crime</p>
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
            <span>MODÈLE: MobileNet v2</span>
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
              {result.targetObject.id === "tasse" && (
                <button className="analyze-btn" onClick={onAnalyze}>
                  🔬 Analyser l'indice
                </button>
              )}
              <button className="retry-btn" onClick={reset}>
                Nouveau scan
              </button>
            </>
          ) : (
            <>
              <span className="result-icon">❓</span>
              <h2>Objet non identifié</h2>
              <p className="raw-label">Détecté : {result.rawPrediction}</p>
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
