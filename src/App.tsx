import { useState } from "react";
import ScanView from "./components/ScanView";
import AnalysisView from "./components/AnalysisView";
import PasseportAnalysis from "./components/PasseportAnalysis";
import CarnetAnalysis from "./components/CarnetAnalysis";
import PhotoAnalysis from "./components/PhotoAnalysis";
import SomniferesAnalysis from "./components/SomniferesAnalysis";
import SerrureAnalysis from "./components/SerrureAnalysis";
import "./App.css";

const DEBUG = new URLSearchParams(window.location.search).has("debug");

const DEBUG_OBJECTS = [
  { id: "tasse", name: "Tasse de café", icon: "☕" },
  { id: "passeport", name: "Passeport", icon: "🛂" },
  { id: "carnet", name: "Carnet", icon: "📓" },
  { id: "photo", name: "Photo", icon: "📷" },
  { id: "somniferes", name: "Somnifères", icon: "💊" },
  { id: "serrure", name: "Serrure", icon: "🔒" },
];

type View = "scan" | "analysis" | "debug";

function App() {
  const [view, setView] = useState<View>("scan");
  const [objectId, setObjectId] = useState<string | null>(null);

  const handleAnalyze = (id: string) => {
    setObjectId(id);
    setView("analysis");
  };

  const handleBack = () => {
    setView("scan");
    setObjectId(null);
  };

  const renderAnalysis = () => {
    switch (objectId) {
      case "tasse": return <AnalysisView onBack={handleBack} />;
      case "passeport": return <PasseportAnalysis onBack={handleBack} />;
      case "carnet": return <CarnetAnalysis onBack={handleBack} />;
      case "photo": return <PhotoAnalysis onBack={handleBack} />;
      case "somniferes": return <SomniferesAnalysis onBack={handleBack} />;
      case "serrure": return <SerrureAnalysis onBack={handleBack} />;
      default: return <AnalysisView onBack={handleBack} />;
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
              <button key={obj.id} className="debug-card" onClick={() => handleAnalyze(obj.id)}>
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
