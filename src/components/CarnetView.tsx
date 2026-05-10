const GAME_IDS = ["manuel", "alarme", "dictaphone", "camera"] as const;
type GameId = (typeof GAME_IDS)[number];

const GAME_LABELS: Record<GameId, string> = {
  manuel: "Manuel de bord",
  alarme: "Boîtier d'alarme incendie",
  dictaphone: "Dictaphone / cassette",
  camera: "Caméra de surveillance",
};

const CLUE_CONCLUSIONS: Record<GameId, string> = {
  manuel:
    "L'équipage a évacué par les capsules de secours suite à l'activation du protocole ECHO-7. Aucun incendie détecté par les capteurs.",
  alarme:
    "Fausse alarme incendie déclenchée manuellement par Léa Fontaine. Le boîtier porte des traces d'intervention volontaire - aucun incendie réel.",
  dictaphone:
    "Léa Fontaine était mandatée avant l'embarquement par une entreprise concurrente pour copier les données de cartographie. Préméditation confirmée par enregistrement.",
  camera:
    "Thomas Aubert a surpris Léa Fontaine dans la salle de navigation. Confrontation directe - alarme déclenchée impulsivement dans la panique.",
};

type Part = string | { blank: string; blocks: number };

const SECTIONS: { title: string; gameId: GameId; parts: Part[] }[] = [
  {
    title: "Découverte du manuel",
    gameId: "manuel",
    parts: [
      "Le sous-marin de recherche NEREIS-7 était en mission de cartographie dans une zone stratégique des fonds marins, sous la direction de la commandante ",
      { blank: "Nathalie Deschamps", blocks: 12 },
      ". À bord : ",
      { blank: "4", blocks: 1 },
      " membres d'équipage. La mission durait depuis ",
      { blank: "3", blocks: 1 },
      " semaines quand l'incident s'est produit. Les premiers jours se sont déroulés normalement - mais des tensions internes s'installaient progressivement : pression sur les résultats, fatigue, désaccords sur les décisions. Le sous-marin a été retrouvé intact. L'équipage avait évacué par ",
      { blank: "les capsules de secours", blocks: 12 },
      ", qui se sont dispersées en mer sans navigation ni balise fonctionnelle. L'équipage n'est pas mort - il est ",
      { blank: "perdu en mer", blocks: 12 },
      ".",
    ],
  },
  {
    title: "Découverte du boîtier de l'alarme incendie",
    gameId: "alarme",
    parts: [
      "Au jour 22, tout s'est arrêté brutalement. Les moteurs ont été coupés, la navigation mise hors service, le recyclage d'air sabré. Une alarme ",
      { blank: "incendie", blocks: 12 },
      " a retenti dans tout le sous-marin. Les premières constatations indiquent que ce déclenchement n'était pas accidentel - le boîtier porte les traces d'une intervention ",
      { blank: "manuelle et volontaire", blocks: 12 },
      ". Les traces relevées sur le déclencheur correspondent au profil de ",
      { blank: "Léa Fontaine, technicienne systèmes embarqués", blocks: 12 },
      ". C'est ",
      { blank: "elle", blocks: 2 },
      " qui a forcé l'évacuation.",
    ],
  },
  {
    title: "Découverte de la cassette / dictaphone",
    gameId: "dictaphone",
    parts: [
      "Avant même le départ en mission, ",
      { blank: "Léa Fontaine", blocks: 12 },
      " avait été approchée par un représentant d'une ",
      { blank: "entreprise concurrente", blocks: 12 },
      ". La mission qui lui avait été confiée en secret : ",
      {
        blank: "copier les données de cartographie et les transmettre à l'extérieur",
        blocks: 12,
      },
      ", sans éveiller les soupçons. En échange : une somme importante versée à l'issue de la mission. L'enregistrement de leur conversation confirme la préméditation. Ce qu'",
      { blank: "elle", blocks: 2 },
      " n'avait pas prévu : être découverte.",
    ],
  },
  {
    title: "Découverte de la caméra de surveillance",
    gameId: "camera",
    parts: [
      "Au jour 22, ",
      { blank: "Thomas Aubert", blocks: 12 },
      " a remarqué une anomalie en consultant les logs de navigation. Il a confronté ",
      { blank: "Léa Fontaine", blocks: 12 },
      " directement, sans en informer la commandante. La caméra du couloir central a tout enregistré - la dispute, la panique, puis ",
      { blank: "Léa Fontaine", blocks: 12 },
      " qui se dirige vers le boîtier d'alarme. Ce n'était pas un plan préparé. C'était ",
      { blank: "une réaction de panique", blocks: 12 },
      " - une décision prise en quelques secondes, sans retour possible.",
    ],
  },
];

interface Props {
  onClose: () => void;
  collectedClues: Set<string>;
}

export default function CarnetView({ onClose, collectedClues }: Props) {
  const total = GAME_IDS.length;
  const collected = collectedClues.size;
  const remaining = total - collected;
  const allCollected = collected === total;

  return (
    <div className="carnet-overlay">
      <div className="carnet-panel">
        <header className="carnet-header">
          <div className="carnet-header-left">
            <span className="carnet-title">CARNET D'INDICES</span>
            <span className="carnet-case">Mission Abysse-7</span>
          </div>
          <button className="carnet-close-btn" onClick={onClose}>
            ✕ FERMER
          </button>
        </header>

        <div className="carnet-progress-wrap">
          <div className="carnet-progress-track">
            <div
              className="carnet-progress-fill"
              style={{ width: `${(collected / total) * 100}%` }}
            />
          </div>
          <div className="carnet-progress-label">
            {collected}/{total} indices — {allCollected ? "ENQUÊTE RÉSOLUE" : "ENQUÊTE EN COURS"}
          </div>
        </div>

        {!allCollected && (
          <div className="carnet-instruction">
            Collecte tous les indices pour compléter le rapport d'enquête
          </div>
        )}

        {allCollected && (
          <div className="carnet-complete-banner">
            ✓ TOUS LES INDICES COLLECTÉS - ENQUÊTE RÉSOLUE
          </div>
        )}

        <div className="carnet-body">
          {/* ── Left: collected clues ── */}
          <div className="carnet-left">
            <div className="carnet-col-title">
              CE QUE TU AS DÉCOUVERT
              <span className={`carnet-count ${allCollected ? "complete" : ""}`}>
                {collected}/{total}
              </span>
            </div>

            {remaining > 0 && (
              <div className="carnet-remaining">
                {remaining} indice{remaining > 1 ? "s" : ""} restant
                {remaining > 1 ? "s" : ""} à collecter
              </div>
            )}

            <div className="carnet-clues-list">
              {GAME_IDS.map((gameId) => {
                const isCollected = collectedClues.has(gameId);
                return (
                  <div
                    key={gameId}
                    className={`carnet-clue-item ${isCollected ? "collected" : "pending"}`}
                  >
                    <div className="carnet-clue-header">
                      <span className="carnet-clue-dot">
                        {isCollected ? "●" : "○"}
                      </span>
                      <span className="carnet-clue-label">
                        {GAME_LABELS[gameId]}
                      </span>
                    </div>
                    {isCollected ? (
                      <p className="carnet-clue-text">
                        {CLUE_CONCLUSIONS[gameId]}
                      </p>
                    ) : (
                      <p className="carnet-clue-pending">
                        - indice non encore collecté -
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right: fill-in-the-blank text ── */}
          <div className="carnet-right">
            <div className="carnet-col-title">RAPPORT D'INCIDENT</div>
            <div className="carnet-text-sections">
              {SECTIONS.map((section) => {
                const revealed = collectedClues.has(section.gameId);
                return (
                  <div
                    key={section.gameId}
                    className={`carnet-text-section ${revealed ? "revealed" : ""}`}
                  >
                    <div className="carnet-text-title">{section.title}</div>
                    <p className="carnet-text-body">
                      {section.parts.map((part, i) => {
                        if (typeof part === "string") {
                          return <span key={i}>{part}</span>;
                        }
                        if (revealed) {
                          return (
                            <span key={i} className="carnet-answer">
                              {part.blank}
                            </span>
                          );
                        }
                        return (
                          <span key={i} className="carnet-blank-hint">
                            [non révélé]
                          </span>
                        );
                      })}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
