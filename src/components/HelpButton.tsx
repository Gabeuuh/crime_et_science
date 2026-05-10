import { useState } from "react";

interface Props {
  title: string;
  lines: string[];
}

export default function HelpButton({ title, lines }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="help-btn" onClick={() => setOpen(true)} aria-label="Aide">
        ?
      </button>
      {open && (
        <div className="help-overlay" onClick={() => setOpen(false)}>
          <div className="help-card" onClick={(e) => e.stopPropagation()}>
            <div className="help-card-title">{title}</div>
            <ul className="help-card-lines">
              {lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
            <button className="help-card-close" onClick={() => setOpen(false)}>
              FERMER
            </button>
          </div>
        </div>
      )}
    </>
  );
}
