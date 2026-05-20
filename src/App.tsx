import { useState, lazy, Suspense } from "react";
import LoginView from "./components/LoginView";
import "./App.css";

const ScanView        = lazy(() => import("./components/ScanView"));
const OnboardingView  = lazy(() => import("./components/OnboardingView"));
const ManuelAnalysis  = lazy(() => import("./components/ManuelAnalysis"));
const AlarmeAnalysis  = lazy(() => import("./components/AlarmeAnalysis"));
const DictaphoneAnalysis = lazy(() => import("./components/DictaphoneAnalysis"));
const CameraAnalysis  = lazy(() => import("./components/CameraAnalysis"));
const CleUSBAnalysis  = lazy(() => import("./components/CleUSBAnalysis"));
const CarnetAnalysis  = lazy(() => import("./components/CarnetAnalysis"));
const CarnetView      = lazy(() => import("./components/CarnetView"));

const LoadingScreen = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", background: "#080f1a", color: "#475569", fontFamily: "Courier New, monospace", fontSize: "0.8rem", letterSpacing: "0.1em" }}>
    CHARGEMENT...
  </div>
);

const DEBUG = new URLSearchParams(window.location.search).has("debug");

const CLUE_OBJECTS = [
  { id: "manuel",     name: "Manuel de bord",       icon: "📖" },
  { id: "alarme",     name: "Boîtier d'alarme",      icon: "🚨" },
  { id: "dictaphone", name: "Cassette",               icon: "📼" },
  { id: "camera",     name: "Caméra surveillance",   icon: "📹" },
  { id: "usb",        name: "Disque dur chiffré",    icon: "🔑" },
];

const TOTAL_CLUES = 5;

type View = "login" | "onboarding" | "scan" | "analysis" | "home";

function App() {
  const [view, setView] = useState<View>("login");
  const [objectId, setObjectId] = useState<string | null>(null);
  const [showCarnet, setShowCarnet] = useState(false);
  const [collectedClues, setCollectedClues] = useState<Set<string>>(new Set());

  const handleAnalyze = (id: string) => {
    setObjectId(id);
    setView("analysis");
  };

  const handleBack = () => {
    setView("home");
    setObjectId(null);
  };

  const handleCollectClue = (gameId: string) => {
    setCollectedClues((prev) => new Set([...prev, gameId]));
  };

  const renderAnalysis = () => {
    switch (objectId) {
      case "manuel":
        return (
          <ManuelAnalysis
            onBack={handleBack}
            onCollectClue={() => handleCollectClue("manuel")}
            isCollected={collectedClues.has("manuel")}
          />
        );
      case "alarme":
        return (
          <AlarmeAnalysis
            onBack={handleBack}
            onCollectClue={() => handleCollectClue("alarme")}
            isCollected={collectedClues.has("alarme")}
          />
        );
      case "dictaphone":
        return (
          <DictaphoneAnalysis
            onBack={handleBack}
            onCollectClue={() => handleCollectClue("dictaphone")}
            isCollected={collectedClues.has("dictaphone")}
          />
        );
      case "camera":
        return (
          <CameraAnalysis
            onBack={handleBack}
            onCollectClue={() => handleCollectClue("camera")}
            isCollected={collectedClues.has("camera")}
          />
        );
      case "usb":
        return <CleUSBAnalysis onBack={handleBack} onCollectClue={() => handleCollectClue("usb")} isCollected={collectedClues.has("usb")} />;
      case "carnet":
        return (
          <CarnetAnalysis
            onBack={handleBack}
            onCollectClue={() => handleCollectClue("carnet")}
            isCollected={collectedClues.has("carnet")}
          />
        );
      default:
        return (
          <ManuelAnalysis
            onBack={handleBack}
            onCollectClue={() => handleCollectClue("manuel")}
            isCollected={collectedClues.has("manuel")}
          />
        );
    }
  };

  return (
    <div className="app">
      {view === "login" && (
        <LoginView onLogin={() => setView("onboarding")} />
      )}
      {view === "onboarding" && (
        <Suspense fallback={<LoadingScreen />}>
          <OnboardingView onDone={() => setView("home")} />
        </Suspense>
      )}

      {/* ── Écran d'accueil ── */}
      {view === "home" && (
        <div className="debug-panel" style={{ background: "#080f1a", minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
          <header className="debug-header" style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "18px 20px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#60a5fa", fontSize: "0.7rem", letterSpacing: "0.1em", fontFamily: "Courier New, monospace" }}>MISSION ABYSSE-7</span>
              <span style={{ color: "#475569", fontSize: "0.65rem", fontFamily: "Courier New, monospace" }}>INSPECTEUR</span>
            </div>
            <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#e2e8f0", letterSpacing: "0.08em" }}>CHOISIR UN INDICE À ANALYSER</h2>
          </header>

          <div className="debug-grid" style={{ flex: 1, padding: "0 16px", gap: "14px", alignContent: "start" }}>
            {CLUE_OBJECTS.map((obj) => {
              const isCollected = collectedClues.has(obj.id);
              return (
                <button
                  key={obj.id}
                  className="debug-card"
                  onClick={() => handleAnalyze(obj.id)}
                  style={{
                    position: "relative",
                    minHeight: "110px",
                    border: isCollected ? "2px solid rgba(34,197,94,0.6)" : "1px solid rgba(96,165,250,0.2)",
                    background: isCollected ? "rgba(34,197,94,0.08)" : undefined,
                    opacity: isCollected ? 0.85 : 1,
                  }}
                >
                  {isCollected && (
                    <span style={{
                      position: "absolute", top: "8px", right: "10px",
                      fontSize: "0.65rem", color: "#4ade80", fontFamily: "Courier New, monospace",
                      letterSpacing: "0.05em"
                    }}>✓ COLLECTÉ</span>
                  )}
                  <span className="debug-card-icon" style={{ fontSize: "2.2rem" }}>{obj.icon}</span>
                  <span className="debug-card-name" style={{ fontSize: "0.85rem", marginTop: "6px" }}>{obj.name}</span>
                </button>
              );
            })}
          </div>

          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <button
              style={{
                width: "100%", padding: "18px", fontSize: "1.1rem", fontWeight: 700,
                background: "linear-gradient(135deg, #1e3a5f, #0f2a4a)",
                border: "2px solid rgba(96,165,250,0.5)", borderRadius: "12px",
                color: "#e2e8f0", cursor: "pointer", letterSpacing: "0.08em",
                fontFamily: "Courier New, monospace", display: "flex", alignItems: "center",
                justifyContent: "center", gap: "12px"
              }}
              onClick={() => setShowCarnet(true)}
            >
              <span style={{ fontSize: "1.4rem" }}>📓</span>
              CONSULTER LE CARNET
              <span style={{
                background: collectedClues.size === TOTAL_CLUES ? "#16a34a" : "#1e40af",
                color: "#fff", borderRadius: "20px", padding: "2px 10px",
                fontSize: "0.85rem", fontWeight: 700
              }}>
                {collectedClues.size}/{TOTAL_CLUES}
              </span>
            </button>
            <button
              className="scan-button home-scan-button"
              style={{ width: "100%", padding: "14px", fontSize: "0.95rem" }}
              onClick={() => setView("scan")}
            >
              <span className="scan-button-inner">📷 SCANNER UN OBJET</span>
            </button>
          </div>

          {DEBUG && (
            <div style={{ padding: "0 16px 12px", textAlign: "center" }}>
              <span style={{ color: "#475569", fontSize: "0.65rem", fontFamily: "Courier New, monospace" }}>MODE DEBUG ACTIF</span>
            </div>
          )}
        </div>
      )}

      {view === "scan" && (
        <Suspense fallback={<LoadingScreen />}>
          <ScanView onAnalyze={handleAnalyze} />
          <button className="back-btn" style={{ position: "fixed", bottom: "90px", left: "50%", transform: "translateX(-50%)", zIndex: 50, background: "rgba(8,15,26,0.85)", border: "1px solid rgba(96,165,250,0.3)", borderRadius: "8px", padding: "10px 20px", color: "#93c5fd", cursor: "pointer", fontSize: "0.8rem", fontFamily: "Courier New, monospace" }} onClick={() => setView("home")}>
            ← RETOUR À L'ACCUEIL
          </button>
        </Suspense>
      )}

      {view === "analysis" && (
        <Suspense fallback={<LoadingScreen />}>
          {renderAnalysis()}
        </Suspense>
      )}

      {/* ── Carnet FAB (hors accueil/login/onboarding pour éviter doublon) ── */}
      {view !== "login" && view !== "onboarding" && view !== "home" && (
        <button
          className="carnet-fab"
          onClick={() => setShowCarnet(true)}
          aria-label="Ouvrir le carnet d'indices"
        >
          <span className="carnet-fab-icon">📓</span>
          <span className="carnet-fab-label">CARNET</span>
          <span className={`carnet-fab-badge ${collectedClues.size === TOTAL_CLUES ? "complete" : ""}`}>
            {collectedClues.size}/{TOTAL_CLUES}
          </span>
        </button>
      )}

      {/* ── Carnet modal ── */}
      {showCarnet && (
        <Suspense fallback={<LoadingScreen />}>
          <CarnetView
            onClose={() => setShowCarnet(false)}
            collectedClues={collectedClues}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
