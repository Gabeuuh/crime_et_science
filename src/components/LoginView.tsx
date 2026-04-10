import { useState, useRef, useEffect } from "react";

const VALID_USERNAME = "INSPECTEUR";
const VALID_PASSWORD = "ABYSSE7";

interface Props {
  onLogin: () => void;
}

export default function LoginView({ onLogin }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [bootDone, setBootDone] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  /* ── Boot animation ── */
  useEffect(() => {
    const t = setTimeout(() => {
      setBootDone(true);
      setTimeout(() => usernameRef.current?.focus(), 100);
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (
      username.trim().toUpperCase() === VALID_USERNAME &&
      password === VALID_PASSWORD
    ) {
      setLoading(true);
      setError(false);
      setTimeout(() => onLogin(), 1600);
    } else {
      setError(true);
      navigator.vibrate?.([80, 40, 80]);
      setPassword("");
    }
  };

  return (
    <div className="login-root">
      {/* Background grid */}
      <div className="login-grid" />

      {/* Top bar */}
      <div className="login-topbar">
        <span className="login-topbar-left">SYSTÈME NEREIS-7 v4.2</span>
        <span className="login-topbar-right">ACCÈS RESTREINT - CONFIDENTIEL</span>
      </div>

      {/* Main card */}
      <div className={`login-card ${bootDone ? "visible" : ""}`}>
        {/* Header */}
        <div className="login-card-header">
          <div className="login-badge">
            <svg viewBox="0 0 40 40" width="40" height="40" fill="none">
              <circle cx="20" cy="20" r="19" stroke="#0072D7" strokeWidth="2" />
              <circle cx="20" cy="20" r="13" stroke="#0072D7" strokeWidth="1" strokeDasharray="3 2" />
              <path d="M20 10 L22 17 L29 17 L23.5 21.5 L25.5 28.5 L20 24 L14.5 28.5 L16.5 21.5 L11 17 L18 17 Z" fill="#0072D7" opacity="0.9" />
            </svg>
          </div>
          <div className="login-title-block">
            <h1 className="login-title">MISSION ABYSSE-7</h1>
            <p className="login-subtitle">Système d'investigation forensique</p>
          </div>
        </div>

        <div className="login-divider" />

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit} autoComplete="off">
          <p className="login-form-label">AUTHENTIFICATION REQUISE</p>

          <div className="login-field">
            <label className="login-label">IDENTIFIANT</label>
            <input
              ref={usernameRef}
              className={`login-input ${error ? "error" : ""}`}
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(false); }}
              placeholder="Entrez votre identifiant"
              autoCapitalize="characters"
              disabled={loading}
              spellCheck={false}
            />
          </div>

          <div className="login-field">
            <label className="login-label">MOT DE PASSE</label>
            <div className="login-pass-wrap">
              <input
                className={`login-input ${error ? "error" : ""}`}
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(false); }}
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                className="login-pass-toggle"
                onClick={() => setShowPass(v => !v)}
                tabIndex={-1}
              >
                {showPass ? "MASQUER" : "VOIR"}
              </button>
            </div>
          </div>

          {error && (
            <p className="login-error">
              ⚠ IDENTIFIANTS INVALIDES - ACCÈS REFUSÉ
            </p>
          )}

          <button
            type="submit"
            className={`login-btn ${loading ? "loading" : ""}`}
            disabled={loading || !username || !password}
          >
            {loading ? (
              <span className="login-btn-loading">
                <span className="login-spinner" />
                AUTHENTIFICATION…
              </span>
            ) : (
              "ACCÉDER AU SYSTÈME"
            )}
          </button>
        </form>

        <div className="login-footer">
          <span>DÉPARTEMENT ENQUÊTES SOUS-MARINES</span>
          <span>ACCÈS NIVEAU 3 - OFFICIERS HABILITÉS</span>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="login-bottombar">
        <span>© 2024 NEREIS FORENSICS</span>
        <span className="login-status-dot" />
        <span>SERVEUR CONNECTÉ</span>
      </div>
    </div>
  );
}
