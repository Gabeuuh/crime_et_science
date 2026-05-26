import { useState, lazy, Suspense, useEffect } from "react";
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
  const [showEndGame, setShowEndGame] = useState(false);

  useEffect(() => {
    if (collectedClues.size === TOTAL_CLUES) {
      setTimeout(() => setShowEndGame(true), 800);
    }
  }, [collectedClues]);

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

      {/* ── Modale fin de jeu ── */}
      {showEndGame && !showCarnet && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 400,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(2,12,24,0.85)",
          backdropFilter: "blur(12px)",
          padding: "24px",
          animation: "fade-in 0.4s ease-out",
        }}>
          <div style={{
            width: "100%", maxWidth: "400px",
            background: "linear-gradient(170deg, rgba(255,255,255,0.97) 0%, rgba(220,245,255,0.95) 100%)",
            borderRadius: "28px",
            border: "1px solid rgba(0,140,220,0.3)",
            boxShadow: "0 24px 80px rgba(0,60,140,0.35), inset 0 1px 0 rgba(255,255,255,0.98)",
            padding: "32px 28px",
            textAlign: "center",
            display: "flex", flexDirection: "column", gap: "20px",
          }}>
            <div style={{ fontSize: "3rem" }}>🎉</div>
            <div>
              <div style={{
                fontFamily: "Courier New, monospace",
                fontSize: "0.75rem", letterSpacing: "0.15em",
                color: "#16a34a", fontWeight: 700, marginBottom: "12px",
              }}>ENQUÊTE RÉSOLUE</div>
              <p style={{
                margin: 0,
                fontFamily: "Courier New, monospace",
                fontSize: "1rem", lineHeight: 1.6,
                color: "#0f172a", fontWeight: 600,
              }}>
                Vous avez résolu l'enquête, merci d'avoir joué à NEREIS-7.
              </p>
            </div>
            <button
              onClick={() => { setShowEndGame(false); setShowCarnet(true); }}
              style={{
                padding: "14px 24px",
                background: "linear-gradient(180deg, #40c0ff 0%, #0088d0 50%, #0060a0 100%)",
                border: "none", borderRadius: "50px",
                color: "#fff", fontFamily: "Courier New, monospace",
                fontSize: "0.9rem", fontWeight: 700, letterSpacing: "0.1em",
                cursor: "pointer",
                boxShadow: "0 4px 20px rgba(0,140,230,0.45), inset 0 1px 0 rgba(255,255,255,0.4)",
              }}
            >
              📓 CONSULTER LES INDICES
            </button>
            <button
              onClick={() => setShowEndGame(false)}
              style={{
                padding: "10px 20px",
                background: "transparent", border: "1px solid rgba(0,100,180,0.3)",
                borderRadius: "50px", color: "#0060a0",
                fontFamily: "Courier New, monospace",
                fontSize: "0.75rem", cursor: "pointer",
              }}
            >
              FERMER
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
