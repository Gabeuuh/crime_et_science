import { useState, useCallback, useEffect, useRef } from "react";
import HelpButton from "./HelpButton";

/* ── Segments (correctOrder 0 → 4) ── */
const SEGMENTS = [
  {
    id: 0,
    correctOrder: 0,
    text: "« Fontaine ? C'est confirmé, vous êtes en position ? »",
    speaker: "INCONNU",
    duration: "0:04",
    wavePattern: [3, 5, 8, 6, 4, 7, 9, 5, 3, 6, 8, 4],
  },
  {
    id: 1,
    correctOrder: 1,
    text: "« Oui, j'ai accès au tableau de navigation depuis la première semaine. »",
    speaker: "L. FONTAINE",
    duration: "0:06",
    wavePattern: [2, 4, 6, 8, 5, 7, 3, 6, 9, 4, 5, 7],
  },
  {
    id: 2,
    correctOrder: 2,
    text: "« Parfait. Les données de cartographie, copiez tout. On a un acheteur. »",
    speaker: "INCONNU",
    duration: "0:05",
    wavePattern: [4, 7, 9, 6, 8, 5, 3, 7, 6, 8, 4, 5],
  },
  {
    id: 3,
    correctOrder: 3,
    text: "« Et si quelqu'un me surprend ? »",
    speaker: "L. FONTAINE",
    duration: "0:03",
    wavePattern: [2, 3, 5, 4, 6, 3, 2, 4, 5, 3, 4, 2],
  },
  {
    id: 4,
    correctOrder: 4,
    text: "« Déclenchez l'alarme incendie. Évacuation, panique, plus de témoins. »",
    speaker: "INCONNU",
    duration: "0:05",
    wavePattern: [5, 8, 6, 9, 7, 4, 8, 6, 5, 7, 9, 6],
  },
];

const INITIAL_POOL = [3, 0, 4, 1, 2];

/* ──────────────────────────────────────────────────
   Puzzle-piece geometry
   ────────────────────────────────────────────────── */

type ConnectorDef = {
  type: "flat" | "tab" | "blank";
  pos: number; // relative position along the edge (0=top, 1=bottom)
  r: number;   // half-height of the bump/indent
  d: number;   // depth the connector protrudes / recedes
};

/**
 * Defines the 4 joints between the 5 pieces.
 * fromRight:true  → left piece has TAB on its right,  right piece has BLANK on its left.
 * fromRight:false → left piece has BLANK on its right, right piece has TAB on its left.
 * Each joint has unique pos/r/d so every piece has a distinct silhouette.
 */
const JOINTS = [
  { fromRight: true,  pos: 0.30, r: 8,  d: 11 }, // joint 0-1
  { fromRight: false, pos: 0.65, r: 10, d: 13 }, // joint 1-2
  { fromRight: true,  pos: 0.50, r: 9,  d: 12 }, // joint 2-3
  { fromRight: true,  pos: 0.35, r: 7,  d: 10 }, // joint 3-4
] as const;

/* Piece shapes derived from JOINTS
   Piece 0 : flat-left  | tab-right (pos 0.30)
   Piece 1 : blank-left (0.30) | blank-right (0.65)   ← double-blank
   Piece 2 : tab-left (0.65)   | tab-right  (0.50)    ← double-tab
   Piece 3 : blank-left (0.50) | tab-right  (0.35)    ← mixed
   Piece 4 : blank-left (0.35) | flat-right            */

const FLAT: ConnectorDef = { type: "flat", pos: 0.5, r: 9, d: 12 };

function getConnectors(order: number): {
  left: ConnectorDef;
  right: ConnectorDef;
} {
  const left: ConnectorDef =
    order === 0
      ? FLAT
      : {
          type: JOINTS[order - 1].fromRight ? "blank" : "tab",
          pos: JOINTS[order - 1].pos,
          r: JOINTS[order - 1].r,
          d: JOINTS[order - 1].d,
        };

  const right: ConnectorDef =
    order === SEGMENTS.length - 1
      ? FLAT
      : {
          type: JOINTS[order].fromRight ? "tab" : "blank",
          pos: JOINTS[order].pos,
          r: JOINTS[order].r,
          d: JOINTS[order].d,
        };

  return { left, right };
}

/**
 * Builds an SVG path for a puzzle piece.
 *  – tabs protrude OUTWARD (beyond the piece rectangle)
 *  – blanks cut INWARD   (into the piece rectangle)
 * Using overflow:visible on the SVG lets tabs extend beyond the element box.
 */
function puzzlePath(
  w: number,
  h: number,
  left: ConnectorDef,
  right: ConnectorDef
): string {
  const ry = right.pos * h;
  const ly = left.pos * h;

  let p = `M 0,0 H ${w}`;

  // ── Right side going down ──
  if (right.type !== "flat") {
    p += ` V ${ry - right.r}`;
    if (right.type === "tab") {
      p += ` C ${w},${ry - right.r} ${w + right.d},${ry - right.r} ${w + right.d},${ry}`;
      p += ` C ${w + right.d},${ry + right.r} ${w},${ry + right.r} ${w},${ry + right.r}`;
    } else {
      p += ` C ${w},${ry - right.r} ${w - right.d},${ry - right.r} ${w - right.d},${ry}`;
      p += ` C ${w - right.d},${ry + right.r} ${w},${ry + right.r} ${w},${ry + right.r}`;
    }
  }
  p += ` V ${h}`;

  // ── Bottom going left ──
  p += ` H 0`;

  // ── Left side going up ──
  if (left.type !== "flat") {
    p += ` V ${ly + left.r}`;
    if (left.type === "blank") {
      p += ` C 0,${ly + left.r} ${left.d},${ly + left.r} ${left.d},${ly}`;
      p += ` C ${left.d},${ly - left.r} 0,${ly - left.r} 0,${ly - left.r}`;
    } else {
      // tab: protrudes leftward (negative x)
      p += ` C 0,${ly + left.r} ${-left.d},${ly + left.r} ${-left.d},${ly}`;
      p += ` C ${-left.d},${ly - left.r} 0,${ly - left.r} 0,${ly - left.r}`;
    }
  }
  p += ` V 0 Z`;
  return p;
}

/* ── Piece dimensions ── */
const SW = 62; // slot piece width
const SH = 52; // slot piece height
const PW = 96; // pool piece width
const PH = 70; // pool piece height

/** SVG piece rendered inside a timeline slot */
function SlotPiece({
  seg,
  left,
  right,
  isWrong,
  isSuccess,
  clipId,
}: {
  seg: (typeof SEGMENTS)[0];
  left: ConnectorDef;
  right: ConnectorDef;
  isWrong: boolean;
  isSuccess: boolean;
  clipId: string;
}) {
  const path = puzzlePath(SW, SH, left, right);
  const mid = SH / 2 - 6;

  const fill = isSuccess
    ? "rgba(0,210,150,0.18)"
    : isWrong
    ? "rgba(220,60,60,0.14)"
    : "rgba(255,255,255,0.88)";
  const stroke = isSuccess ? "rgba(0,190,130,0.70)" : isWrong ? "rgba(200,50,50,0.55)" : "rgba(120,195,240,0.65)";
  const waveColor = isSuccess ? "#00c890" : isWrong ? "#dc3c3c" : "#00a8e0";

  return (
    <svg
      width={SW}
      height={SH}
      viewBox={`0 0 ${SW} ${SH}`}
      style={{ overflow: "visible", display: "block", flexShrink: 0 }}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={path} />
        </clipPath>
      </defs>
      <path d={path} fill={fill} stroke={stroke} strokeWidth="1.5" />
      <g clipPath={`url(#${clipId})`}>
        {seg.wavePattern.map((hv, i) => {
          const bh = hv * 2.4;
          return (
            <rect
              key={i}
              x={5 + i * 4.4}
              y={mid - bh / 2}
              width={3}
              height={bh}
              rx={1}
              fill={waveColor}
              opacity={0.9}
            />
          );
        })}
      </g>
      <text
        x={SW / 2}
        y={SH - 8}
        textAnchor="middle"
        fontSize="5.5"
        fontFamily="Courier New, monospace"
        fontWeight="700"
        fill={isSuccess ? "#00a878" : isWrong ? "#cc3030" : "#0070a0"}
        letterSpacing="0.3"
      >
        {seg.speaker.length > 9 ? seg.speaker.slice(0, 9) : seg.speaker}
      </text>
      <text
        x={SW / 2}
        y={SH - 2}
        textAnchor="middle"
        fontSize="4.5"
        fontFamily="Courier New, monospace"
        fill="#6aaac8"
      >
        {seg.duration}
      </text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════ */

interface Props {
  onBack: () => void;
  onCollectClue?: () => void;
  isCollected?: boolean;
  onOpenCarnet?: () => void;
}

export default function DictaphoneAnalysis({ onBack, onCollectClue, isCollected, onOpenCarnet }: Props) {
  const [pool, setPool] = useState<number[]>(INITIAL_POOL);
  const [slots, setSlots] = useState<(number | null)[]>([
    null, null, null, null, null,
  ]);
  const [selectedPoolIdx, setSelectedPoolIdx] = useState<number | null>(null);
  const [wrongSlots, setWrongSlots] = useState<number[]>([]);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const validating = useRef(false);

  const [dragging, setDragging] = useState<{ segId: number; poolIdx: number } | null>(null);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Suppression de l'auto-avancement : l'utilisateur clique "Suivant" manuellement

  const validate = useCallback(() => {
    if (validating.current || isCorrect) return;
    validating.current = true;

    const wrongIdxs = slots
      .map((segId, i) =>
        segId !== null && SEGMENTS[segId].correctOrder !== i ? i : -1
      )
      .filter((i) => i !== -1);

    if (wrongIdxs.length === 0) {
      setIsCorrect(true);
      navigator.vibrate?.([80, 40, 80, 40, 120]);
      setTimeout(() => setShowTranscript(true), 900);
      validating.current = false;
    } else {
      setWrongSlots(wrongIdxs);
      navigator.vibrate?.(300);
      setTimeout(() => {
        setPool((prev) => [...prev, ...wrongIdxs.map((i) => slots[i]!)]);
        setSlots((prev) => {
          const next = [...prev];
          wrongIdxs.forEach((i) => {
            next[i] = null;
          });
          return next;
        });
        setWrongSlots([]);
        validating.current = false;
      }, 900);
    }
  }, [slots, isCorrect]);

  useEffect(() => {
    if (
      !isCorrect &&
      slots.every((s) => s !== null) &&
      !validating.current &&
      wrongSlots.length === 0
    ) {
      validate();
    }
  }, [slots, validate, isCorrect, wrongSlots]);

  const handlePoolClick = useCallback(
    (poolIdx: number) => {
      if (isCorrect || wrongSlots.length > 0) return;
      setSelectedPoolIdx((prev) => (prev === poolIdx ? null : poolIdx));
    },
    [isCorrect, wrongSlots]
  );

  const handleSlotClick = useCallback(
    (slotIdx: number) => {
      if (isCorrect || wrongSlots.length > 0) return;
      const current = slots[slotIdx];

      if (current !== null) {
        setPool((prev) => [...prev, current]);
        setSlots((prev) => {
          const next = [...prev];
          next[slotIdx] = null;
          return next;
        });
        setSelectedPoolIdx(null);
        navigator.vibrate?.(15);
      } else if (selectedPoolIdx !== null) {
        const segId = pool[selectedPoolIdx];
        setSlots((prev) => {
          const next = [...prev];
          next[slotIdx] = segId;
          return next;
        });
        setPool((prev) => prev.filter((_, i) => i !== selectedPoolIdx));
        setSelectedPoolIdx(null);
        navigator.vibrate?.(25);
      }
    },
    [isCorrect, wrongSlots, slots, pool, selectedPoolIdx]
  );

  const handlePiecePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, poolIdx: number, segId: number) => {
      if (isCorrect || wrongSlots.length > 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging({ segId, poolIdx });
      setGhostPos({ x: e.clientX - PW / 2, y: e.clientY - PH / 2 });
      setHasInteracted(true);
    },
    [isCorrect, wrongSlots]
  );

  const handlePiecePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      setGhostPos({ x: e.clientX - PW / 2, y: e.clientY - PH / 2 });
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cell = el?.closest("[data-slot-idx]") as HTMLElement | null;
      const idx = cell ? parseInt(cell.dataset.slotIdx!, 10) : null;
      setHoverSlot(idx !== null && slots[idx] === null ? idx : null);
    },
    [dragging, slots]
  );

  const handlePiecePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cell = el?.closest("[data-slot-idx]") as HTMLElement | null;
      const targetSlot = cell ? parseInt(cell.dataset.slotIdx!, 10) : null;

      if (targetSlot !== null && slots[targetSlot] === null) {
        const { segId, poolIdx } = dragging;
        setSlots((prev) => { const next = [...prev]; next[targetSlot] = segId; return next; });
        setPool((prev) => prev.filter((_, i) => i !== poolIdx));
        setSelectedPoolIdx(null);
        navigator.vibrate?.(40);
      }
      setDragging(null);
      setHoverSlot(null);
    },
    [dragging, slots]
  );

  const placedCount = slots.filter((s) => s !== null).length;

  return (
    <div className="analysis-view">
      <header className="analysis-header" style={{ position: "relative" }}>
        <button className="back-btn" onClick={onBack}>
          ← RETOUR
        </button>
        <div className="header-center">
          <span className="header-dept">ENQUETE SOUS-MARINE</span>
          <span className="header-case">Mission Abysse-7</span>
        </div>
        <span className="evidence-tag">INDICE 3 - CASSETTE</span>
        <HelpButton
          title="AIDE - DICTAPHONE"
          lines={[
            "Glisse chaque fragment audio dans un emplacement numéroté",
            "Place-les dans l'ordre chronologique de la conversation",
            "Tu peux aussi appuyer sur un fragment puis sur un emplacement",
            "Valide quand tous les 5 fragments sont placés",
          ]}
        />
      </header>
      <div className="role-banner">RÔLE : INSPECTEUR - Interface d'analyse</div>

      <div className="canvas-container dictaphone-container">
        {/* Dictaphone device */}
        <div className="dictaphone-device">
          <div className="dictaphone-speaker" />
          <div className="dictaphone-screen">
            {isCorrect ? "▶ LECTURE EN COURS" : "■ BANDE FRAGMENTEE"}
          </div>
          <div className="dictaphone-buttons">
            <div className="dictaphone-btn" />
            <div className="dictaphone-btn rec" />
            <div className="dictaphone-btn" />
          </div>
        </div>

        {/* ── BANDE (5 slots) ── */}
        <div className="tape-timeline">
          <div className="timeline-label">
            {isCorrect
              ? "✓ BANDE RECONSTITUÉE"
              : selectedPoolIdx !== null
              ? "CHOISISSEZ UN EMPLACEMENT"
              : "RECONSTITUEZ LA BANDE DANS L'ORDRE"}
          </div>
          <div className="tape-track-row">
            <div className="tape-reel" />
            <div className="tape-slots-row">
              {slots.map((segId, slotIdx) => {
                const seg = segId !== null ? SEGMENTS[segId] : null;
                const isWrong = wrongSlots.includes(slotIdx);
                const canDrop = !seg && (selectedPoolIdx !== null || (dragging !== null));

                return (
                  <div
                    key={slotIdx}
                    className={`tape-slot-cell ${isWrong ? "shaking" : ""} ${hoverSlot === slotIdx && slots[slotIdx] === null ? "drag-hover" : ""}`}
                    style={{ zIndex: slotIdx }}
                    data-slot-idx={slotIdx}
                    onClick={() => handleSlotClick(slotIdx)}
                  >
                    {seg ? (
                      <SlotPiece
                        seg={seg}
                        left={getConnectors(seg.correctOrder).left}
                        right={getConnectors(seg.correctOrder).right}
                        isWrong={isWrong}
                        isSuccess={isCorrect}
                        clipId={`sc-${slotIdx}`}
                      />
                    ) : (
                      <div
                        className={`tape-empty-slot ${canDrop ? "droppable" : ""}`}
                        style={{ width: SW, height: SH }}
                      >
                        <span className="tape-slot-num">{slotIdx + 1}</span>
                        <span className="tape-slot-hint">
                          {canDrop ? "⊕" : "· · ·"}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="tape-reel" />
          </div>
        </div>

        {/* ── POOL ── */}
        {!isCorrect && (
          <div className="fragments-pool">
            {!hasInteracted && (
              <p className="instructions" style={{ textAlign: "center", marginBottom: 8 }}>
                Glisse les segments audio dans l'ordre chronologique de la conversation
              </p>
            )}
            <div className="timeline-label">
              {pool.length > 0
                ? `FRAGMENTS DISPONIBLES (${pool.length})`
                : "TOUS LES FRAGMENTS PLACÉS…"}
            </div>
            <div className="pool-pieces">
              {pool.map((segId, poolIdx) => {
                const seg = SEGMENTS[segId];
                const { left, right } = getConnectors(seg.correctOrder);
                const isSelected = selectedPoolIdx === poolIdx;
                const path = puzzlePath(PW, PH, left, right);
                const mid = PH / 2 - 8;
                const wc = isSelected ? "#e09000" : "#00a0d8";
                const fill = isSelected
                  ? "rgba(255,200,40,0.18)"
                  : "rgba(255,255,255,0.90)";
                const stroke = isSelected ? "rgba(220,150,0,0.70)" : "rgba(110,190,238,0.65)";

                return (
                  <div
                    key={segId}
                    className={`pool-piece-wrap ${isSelected ? "selected" : ""} ${!hasInteracted && !isCorrect && !dragging ? "breathing" : ""} ${dragging?.poolIdx === poolIdx ? "dragging-active" : ""}`}
                    style={{ touchAction: "none", cursor: dragging?.poolIdx === poolIdx ? "grabbing" : "grab" }}
                    onClick={() => handlePoolClick(poolIdx)}
                    onPointerDown={(e) => handlePiecePointerDown(e, poolIdx, segId)}
                    onPointerMove={handlePiecePointerMove}
                    onPointerUp={handlePiecePointerUp}
                  >
                    <svg
                      width={PW}
                      height={PH}
                      viewBox={`0 0 ${PW} ${PH}`}
                      style={{ overflow: "visible", display: "block" }}
                    >
                      <defs>
                        <clipPath id={`pc-${segId}`}>
                          <path d={path} />
                        </clipPath>
                      </defs>
                      <path
                        d={path}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth="1.5"
                      />
                      <g clipPath={`url(#pc-${segId})`}>
                        {seg.wavePattern.map((hv, i) => {
                          const bh = hv * 3.0;
                          return (
                            <rect
                              key={i}
                              x={7 + i * 6.2}
                              y={mid - bh / 2}
                              width={4}
                              height={bh}
                              rx={1}
                              fill={wc}
                              opacity={0.9}
                            />
                          );
                        })}
                      </g>
                      <text
                        x={PW / 2}
                        y={PH - 9}
                        textAnchor="middle"
                        fontSize="7"
                        fontFamily="Courier New, monospace"
                        fontWeight="700"
                        fill={isSelected ? "#c07800" : "#0070a0"}
                        letterSpacing="0.5"
                      >
                        {seg.speaker}
                      </text>
                      <text
                        x={PW / 2}
                        y={PH - 2}
                        textAnchor="middle"
                        fontSize="5.5"
                        fontFamily="Courier New, monospace"
                        fill="#6aaac8"
                      >
                        {seg.duration}
                      </text>
                    </svg>
                  </div>
                );
              })}
              {pool.length === 0 && (
                <div className="pool-empty-hint">- AUCUN FRAGMENT -</div>
              )}
            </div>
          </div>
        )}

        {/* Transcript overlay */}
        {showTranscript && (
          <div className="transcript-overlay">
            <div className="transcript-card">
              <div className="transcript-title">TRANSCRIPTION AUDIO</div>
              {[...SEGMENTS]
                .sort((a, b) => a.correctOrder - b.correctOrder)
                .map((seg) => (
                  <div key={seg.id} className="transcript-line">
                    <span className="transcript-speaker">{seg.speaker} :</span>
                    <span className="transcript-text">{seg.text}</span>
                  </div>
                ))}
              <button
                className="collect-clue-btn"
                style={{ marginTop: "16px", width: "100%" }}
                onClick={() => setShowReport(true)}
              >
                SUIVANT →
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="tools-bar">
        <div className="trace-counter">
          <span className="counter-label">PLACÉS</span>
          <span className="counter-value">
            {placedCount}/{SEGMENTS.length}
          </span>
        </div>
      </div>

      {!isCorrect && (
        <div className="uv-indicator" style={{ borderLeftColor: "#a855f7" }}>
          <span
            className="uv-dot"
            style={{ background: "#a855f7", boxShadow: "0 0 6px #a855f7" }}
          />
          {hasInteracted ? "PLACE TOUS LES FRAGMENTS DANS L'ORDRE" : "GLISSE LES FRAGMENTS DANS L'ORDRE DE LA CONVERSATION"}
        </div>
      )}

      {showReport && (
        <div className="report-overlay">
          <div className="report-card">
            <div className="report-stripe" />
            <div className="report-header">
                <h3>RAPPORT - CASSETTE</h3>
            </div>
            <div className="report-body">
              <div className="report-row">
                <div className="report-row-num">01</div>
                <div className="report-row-content">
                  <span className="report-row-label">Locuteurs identifiés</span>
                  <span className="report-row-value">
                    Léa Fontaine (technicienne navigation) et un interlocuteur
                    non identifié (entreprise concurrente)
                  </span>
                </div>
              </div>
              <div className="report-row">
                <div className="report-row-num">02</div>
                <div className="report-row-content">
                  <span className="report-row-label">Contenu</span>
                  <span className="report-row-value">
                    Mission d'espionnage : copie des données de cartographie
                    sous-marine. Plan de repli : déclenchement de l'alarme
                    incendie pour couvrir la fuite.
                  </span>
                </div>
              </div>
              <div className="report-row">
                <div className="report-row-num">03</div>
                <div className="report-row-content">
                  <span className="report-row-label">Préméditation</span>
                  <span className="report-row-value">
                    La conversation prouve que le sabotage était planifié avant
                    même l'embarquement. Mobile : espionnage industriel.
                  </span>
                </div>
              </div>
            </div>
            <div className="report-footer">
              <p className="report-instruction">
                CONCLUSION : PREUVE DE PRÉMÉDITATION - ESPIONNAGE INDUSTRIEL
              </p>
              {!isCollected ? (
                <button
                  className="collect-clue-btn"
                  onClick={() => onCollectClue?.()}
                >
                  COLLECTER L'INDICE
                </button>
              ) : (
                <>
                  <div className="clue-collected-badge">✓ INDICE COLLECTÉ</div>
                  <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                    <button className="report-close-btn" style={{ background: "rgba(30,58,95,0.8)", borderColor: "rgba(96,165,250,0.5)", color: "#93c5fd" }} onClick={onOpenCarnet}>
                      📓 CONSULTER LE CARNET
                    </button>
                    <button className="report-close-btn" style={{ background: "rgba(30,58,95,0.8)", borderColor: "rgba(96,165,250,0.5)", color: "#93c5fd" }} onClick={onBack}>
                      ← RETOUR À L'ACCUEIL
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {dragging && (
        (() => {
          const seg = SEGMENTS[dragging.segId];
          const { left, right } = getConnectors(seg.correctOrder);
          const path = puzzlePath(PW, PH, left, right);
          const mid = PH / 2 - 8;
          return (
            <div
              className="drag-ghost"
              style={{ left: ghostPos.x, top: ghostPos.y }}
            >
              <svg width={PW} height={PH} viewBox={`0 0 ${PW} ${PH}`} style={{ overflow: "visible", display: "block" }}>
                <path d={path} fill="rgba(255,255,255,0.90)" stroke="rgba(110,190,238,0.65)" strokeWidth="1.5" />
                <g>
                  {seg.wavePattern.map((hv, i) => {
                    const bh = hv * 3.0;
                    return <rect key={i} x={7 + i * 6.2} y={mid - bh / 2} width={4} height={bh} rx={1} fill="#00a0d8" opacity={0.9} />;
                  })}
                </g>
                <text x={PW / 2} y={PH - 9} textAnchor="middle" fontSize="7" fontFamily="Courier New, monospace" fontWeight="700" fill="#0070a0" letterSpacing="0.5">{seg.speaker}</text>
                <text x={PW / 2} y={PH - 2} textAnchor="middle" fontSize="5.5" fontFamily="Courier New, monospace" fill="#6aaac8">{seg.duration}</text>
              </svg>
            </div>
          );
        })()
      )}
    </div>
  );
}
