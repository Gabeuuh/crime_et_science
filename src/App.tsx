import { useState } from "react";
import ScanView from "./components/ScanView";
import AnalysisView from "./components/AnalysisView";
import "./App.css";

type View = "scan" | "analysis";

function App() {
  const [view, setView] = useState<View>("scan");

  return (
    <div className="app">
      {view === "scan" ? (
        <ScanView onAnalyze={() => setView("analysis")} />
      ) : (
        <AnalysisView onBack={() => setView("scan")} />
      )}
    </div>
  );
}

export default App;
