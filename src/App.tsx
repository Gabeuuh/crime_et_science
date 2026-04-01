import { useState } from "react";
import ScanView from "./components/ScanView";
import ManuelAnalysis from "./components/ManuelAnalysis";
import AlarmeAnalysis from "./components/AlarmeAnalysis";
import DictaphoneAnalysis from "./components/DictaphoneAnalysis";
import CameraAnalysis from "./components/CameraAnalysis";
import CleUSBAnalysis from "./components/CleUSBAnalysis";
import "./App.css";

const DEBUG = new URLSearchParams(window.location.search).has("debug");

const DEBUG_OBJECTS = [
  { id: "manuel", name: "Manuel de bord", icon: "📖" },
  { id: "alarme", name: "Boîtier d'alarme", icon: "🚨" },
  { id: "dictaphone", name: "Dictaphone", icon: "🎙️" },
  { id: "camera", name: "Caméra surveillance", icon: "📹" },
  { id: "usb", name: "Clé USB", icon: "🔑" },
];

type View = "scan" | "analysis" | "debug";

function App() {
  const [view, setView] = useState<View>("scan");
  const [objectId, setObjectId] = useState<string | null>(null);

  const handleAnalyze = (id: string) => {
    setObjectId(id);
    setView("analysis");
  };

  const [fromDebug, setFromDebug] = useState(false);

  const handleBack = () => {
    setView(fromDebug ? "debug" : "scan");
    setObjectId(null);
    setFromDebug(false);
  };

  const renderAnalysis = () => {
    switch (objectId) {
      case "manuel": return <ManuelAnalysis onBack={handleBack} />;
      case "alarme": return <AlarmeAnalysis onBack={handleBack} />;
      case "dictaphone": return <DictaphoneAnalysis onBack={handleBack} />;
      case "camera": return <CameraAnalysis onBack={handleBack} />;
      case "usb": return <CleUSBAnalysis onBack={handleBack} />;
      default: return <ManuelAnalysis onBack={handleBack} />;
    }
  };

  return (
    <div className="app">
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
    </div>
  );
}

export default App;
