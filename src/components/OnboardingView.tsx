import { useState } from "react";

const SLIDES = [
  {
    icon: "⚓",
    title: "MISSION ABYSSE-7",
    body: "Le sous-marin de recherche NEREIS-7 a été retrouvé intact, à la dérive. L'équipage a disparu. Tu es l'inspecteur chargé d'élucider l'incident.",
  },
  {
    icon: "🔬",
    title: "TON RÔLE — INSPECTEUR",
    body: "Tu analyses les indices récupérés depuis le sous-marin. Chaque objet contient des informations cachées. Tu dois les révéler et les consigner dans ton carnet d'indices.",
  },
  {
    icon: "🥽",
    title: "L'AUTRE JOUEUR — ÉQUIPE VR",
    body: "Ton coéquipier explore le sous-marin en réalité virtuelle. Il te transmet les objets physiques à analyser. Vous collaborez pour résoudre l'enquête.",
  },
  {
    icon: "📷",
    title: "COMMENT DÉMARRER",
    body: "Pointe la tablette vers un objet récupéré par ton coéquipier et appuie sur SCANNER. L'IA identifie l'objet et te donne accès à son analyse.",
  },
];

interface Props {
  onDone: () => void;
}

export default function OnboardingView({ onDone }: Props) {
  const [slide, setSlide] = useState(0);
  const isLast = slide === SLIDES.length - 1;
  const current = SLIDES[slide];

  return (
    <div className="onboarding-root">
      <div className="onboarding-grid" />
      <button className="onboarding-skip" onClick={onDone}>
        PASSER →
      </button>
      <div className="onboarding-card">
        <div className="onboarding-icon">{current.icon}</div>
        <div className="onboarding-title">{current.title}</div>
        <div className="onboarding-divider" />
        <p className="onboarding-body">{current.body}</p>
        <div className="onboarding-dots">
          {SLIDES.map((_, i) => (
            <span key={i} className={`onboarding-dot ${i === slide ? "active" : ""}`} />
          ))}
        </div>
        <button
          className="onboarding-btn"
          onClick={() => (isLast ? onDone() : setSlide((s) => s + 1))}
        >
          {isLast ? "COMMENCER L'ENQUÊTE" : "SUIVANT →"}
        </button>
      </div>
    </div>
  );
}
