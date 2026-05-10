import { useState } from "react";
import LoginView from "./components/LoginView";
import ScanView from "./components/ScanView";
import ManuelAnalysis from "./components/ManuelAnalysis";
import AlarmeAnalysis from "./components/AlarmeAnalysis";
import DictaphoneAnalysis from "./components/DictaphoneAnalysis";
import CameraAnalysis from "./components/CameraAnalysis";
import CleUSBAnalysis from "./components/CleUSBAnalysis";
import CarnetView from "./components/CarnetView";
import CarnetAnalysis from "./components/CarnetAnalysis";
import OnboardingView from "./components/OnboardingView";
import "./App.css";

const DEBUG = new URLSearchParams(window.location.search).has("debug");

const DEBUG_OBJECTS = [
  { id: "manuel", name: "Manuel de bord", icon: "📖" },
  { id: "alarme", name: "Alarme incendie", icon: "🚨" },
  { id: "dictaphone", name: "Cassette", icon: "🎙️" },
  { id: "camera", name: "Caméra", icon: "📹" },
  { id: "usb", name: "Disque dur", icon: "🔑" },
];

const TOTAL_CLUES = 4;

type View = "login" | "onboarding" | "scan" | "analysis" | "debug";

function App() {
  const [view, setView] = useState<View>("login");
  const [objectId, setObjectId] = useState<string | null>(null);
  const [fromDebug, setFromDebug] = useState(false);
  const [showCarnet, setShowCarnet] = useState(false);
  const [collectedClues, setCollectedClues] = useState<Set<string>>(new Set());

  const handleAnalyze = (id: string) => {
    setObjectId(id);
    setView("analysis");
  };

  const handleBack = () => {
    setView(fromDebug ? "debug" : "scan");
    setObjectId(null);
    setFromDebug(false);
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
        return <CleUSBAnalysis onBack={handleBack} />;
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
        <OnboardingView onDone={() => setView("scan")} />
      )}
      {view === "scan" && (
        <>
          <ScanView onAnalyze={handleAnalyze} />
          {DEBUG && (
            <button className="debug-fab" onClick={() => setView("debug")}>
              DEBUG
            </button>
          )}
        </>
      )}
      {view === "debug" && (
        <div className="debug-panel">
          <header className="debug-header">
            <button className="back-btn" onClick={() => setView("scan")}>← RETOUR</button>
            <h2>MODE DEBUG</h2>
          </header>
          <div className="debug-grid">
            {DEBUG_OBJECTS.map((obj) => (
              <button key={obj.id} className="debug-card" onClick={() => { setFromDebug(true); handleAnalyze(obj.id); }}>
                <span className="debug-card-icon">{obj.icon}</span>
                <span className="debug-card-name">{obj.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {view === "analysis" && renderAnalysis()}

      {/* ── Carnet FAB ── */}
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

      {/* ── Carnet modal ── */}
      {showCarnet && (
        <CarnetView
          onClose={() => setShowCarnet(false)}
          collectedClues={collectedClues}
        />
      )}
    </div>
  );
}

export default App;
