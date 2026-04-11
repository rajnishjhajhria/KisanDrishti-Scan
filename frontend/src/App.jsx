import { useState, useRef, useCallback, useEffect } from "react";

const API = "http://localhost:8000";

const GRADE_COLOR = {
  "Grade A": "#4ade80",
  "Grade B": "#a3e635",
  "Grade C": "#fbbf24",
  "Reject": "#f87171",
};
const SEV_COLOR = { high: "#f87171", medium: "#fbbf24", low: "#4ade80", none: "#4ade80" };

/* ── Animated confidence bar ─────────────────────────── */
function Bar({ value, color = "#4ade80", height = 6 }) {
  return (
    <div style={{
      height, borderRadius: 99,
      background: "rgba(255,255,255,0.08)",
      overflow: "hidden", position: "relative"
    }}>
      <div style={{
        height: "100%",
        width: `${Math.round(value * 100)}%`,
        background: `linear-gradient(90deg, ${color}99, ${color})`,
        borderRadius: 99,
        transition: "width 0.8s cubic-bezier(0.34,1.56,0.64,1)",
        boxShadow: `0 0 8px ${color}66`,
      }} />
    </div>
  );
}

/* ── Pill badge ─────────────────────────────────────── */
function Pill({ text, color = "#4ade80" }) {
  return (
    <span style={{
      background: color + "22",
      color,
      border: `1px solid ${color}44`,
      borderRadius: 20,
      padding: "3px 11px",
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.03em",
      fontFamily: "'DM Sans', sans-serif",
    }}>{text}</span>
  );
}

/* ── Section card ─────────────────────────────────────── */
function Card({ children, style = {}, glow = false }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: 20,
      padding: "22px 24px",
      backdropFilter: "blur(12px)",
      boxShadow: glow
        ? "0 0 40px rgba(74,222,128,0.08), 0 4px 24px rgba(0,0,0,0.4)"
        : "0 4px 24px rgba(0,0,0,0.3)",
      ...style,
    }}>{children}</div>
  );
}

/* ── Label ─────────────────────────────────────────────── */
function Label({ children }) {
  return (
    <p style={{
      margin: "0 0 6px",
      fontSize: 10,
      fontWeight: 700,
      color: "rgba(255,255,255,0.35)",
      textTransform: "uppercase",
      letterSpacing: "0.12em",
      fontFamily: "'DM Sans', sans-serif",
    }}>{children}</p>
  );
}

/* ── Dot loader ─────────────────────────────────────────── */
function Loader() {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 12 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "#4ade80",
          animation: `kd-pulse 1.3s ${i * 0.18}s ease-in-out infinite`,
          boxShadow: "0 0 6px #4ade8088",
        }} />
      ))}
    </div>
  );
}

/* ── Main App ─────────────────────────────────────────── */
export default function App() {
  const inputRef = useRef(null);
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState(null);
  const [drag, setDrag]           = useState(false);
  const [cropHint, setCropHint]   = useState("");
  const [mounted, setMounted]     = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const analyze = useCallback(async (f, hint = "") => {
    setError(null); setResult(null); setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const url = `${API}/analyze${hint ? `?crop_hint=${encodeURIComponent(hint)}` : ""}`;
      const r = await fetch(url, { method: "POST", body: fd });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.detail || `Error ${r.status}`);
      }
      setResult(await r.json());
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, []);

  const handleFile = (f) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null); setError(null);
    analyze(f);
  };

  const onDrop = useCallback(e => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  }, [analyze]);

  const d = result?.disease;
  const q = result?.quality;
  const c = result?.claude;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0a110d;
          background-image:
            radial-gradient(ellipse 80% 50% at 20% 10%, rgba(20,83,45,0.45) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 90%, rgba(5,46,22,0.5) 0%, transparent 60%);
          min-height: 100vh;
          color: #e2ffe8;
          font-family: 'DM Sans', sans-serif;
        }

        @keyframes kd-pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }

        @keyframes kd-fadeup {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes kd-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }

        .kd-fadein { animation: kd-fadeup 0.5s ease both; }
        .kd-fadein-1 { animation: kd-fadeup 0.5s 0.1s ease both; }
        .kd-fadein-2 { animation: kd-fadeup 0.5s 0.2s ease both; }
        .kd-fadein-3 { animation: kd-fadeup 0.5s 0.3s ease both; }

        .kd-upload:hover { border-color: rgba(74,222,128,0.5) !important; background: rgba(74,222,128,0.06) !important; }

        .kd-btn:hover { background: rgba(74,222,128,0.18) !important; }
        .kd-btn:active { transform: scale(0.97); }

        .kd-hint input:focus { outline: none; border-color: rgba(74,222,128,0.5) !important; }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(74,222,128,0.3); border-radius: 2px; }
      `}</style>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "36px 24px 64px" }}>

        {/* ── Header ──────────────────────────────────────── */}
        <div className="kd-fadein" style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 14,
              background: "linear-gradient(135deg, #166534, #4ade80)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, boxShadow: "0 4px 20px rgba(74,222,128,0.35)",
            }}>🌿</div>
            <div>
              <h1 style={{
                fontSize: 28, fontWeight: 700, fontFamily: "'DM Serif Display', serif",
                color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.1,
              }}>KisanDrishti <span style={{ color: "#4ade80" }}>Scan</span></h1>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
                Trained model + Claude AI · <span style={{ fontFamily: "serif" }}>फसल रोग पहचान</span>
              </p>
            </div>

            {/* Live status dots */}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 20, padding: "5px 12px" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80" }} />
                <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 600 }}>PyTorch</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 20, padding: "5px 12px" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", boxShadow: "0 0 6px #a78bfa" }} />
                <span style={{ fontSize: 11, color: "#a78bfa", fontWeight: 600 }}>Claude AI</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Upload + Preview row ─────────────────────────── */}
        <div className="kd-fadein-1" style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "stretch" }}>

          {/* Drop zone */}
          <div
            className="kd-upload"
            style={{
              flex: 1,
              border: `2px dashed ${drag ? "rgba(74,222,128,0.6)" : "rgba(255,255,255,0.12)"}`,
              borderRadius: 20,
              padding: "44px 24px",
              textAlign: "center",
              cursor: loading ? "wait" : "pointer",
              background: drag ? "rgba(74,222,128,0.06)" : "rgba(255,255,255,0.02)",
              transition: "all .25s ease",
              position: "relative",
              overflow: "hidden",
            }}
            onClick={() => !loading && inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
          >
            <input ref={inputRef} type="file" accept="image/*"
              style={{ display: "none" }}
              onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />

            {/* Decorative corner lines */}
            {["tl","tr","bl","br"].map(pos => (
              <div key={pos} style={{
                position: "absolute",
                width: 24, height: 24,
                [pos.includes("t") ? "top" : "bottom"]: 12,
                [pos.includes("l") ? "left" : "right"]: 12,
                borderTop: pos.includes("t") ? "2px solid rgba(74,222,128,0.4)" : "none",
                borderBottom: pos.includes("b") ? "2px solid rgba(74,222,128,0.4)" : "none",
                borderLeft: pos.includes("l") ? "2px solid rgba(74,222,128,0.4)" : "none",
                borderRight: pos.includes("r") ? "2px solid rgba(74,222,128,0.4)" : "none",
                borderRadius: pos === "tl" ? "4px 0 0 0" : pos === "tr" ? "0 4px 0 0" : pos === "bl" ? "0 0 0 4px" : "0 0 4px 0",
              }} />
            ))}

            <div style={{ fontSize: 48, marginBottom: 12, filter: loading ? "grayscale(0.5)" : "none", transition: "filter .3s" }}>
              {loading ? "⚙️" : "🌾"}
            </div>
            <p style={{ fontWeight: 700, fontSize: 17, color: loading ? "rgba(255,255,255,0.5)" : "#fff", marginBottom: 6, fontFamily: "'DM Serif Display', serif" }}>
              {loading ? "Analyzing your crop..." : "Drop a crop photo here"}
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              {loading ? "Running PyTorch + Claude AI" : "Click to browse · JPEG, PNG, WEBP · max 10MB"}
            </p>
            {loading && <Loader />}
          </div>

          {/* Preview panel */}
          {preview && (
            <div style={{ width: 180, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ position: "relative" }}>
                <img src={preview} alt="crop"
                  style={{
                    width: "100%", aspectRatio: "1", objectFit: "cover",
                    borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                  }} />
                {loading && (
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: 16,
                    background: "rgba(0,0,0,0.55)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <div style={{
                      width: 36, height: 36, border: "3px solid rgba(74,222,128,0.3)",
                      borderTop: "3px solid #4ade80",
                      borderRadius: "50%",
                      animation: "kd-spin 0.9s linear infinite",
                    }} />
                  </div>
                )}
              </div>

              {/* Crop hint + re-analyze */}
              {result && (
                <div className="kd-hint">
                  <input
                    value={cropHint}
                    onChange={e => setCropHint(e.target.value)}
                    placeholder="Crop hint (optional)"
                    list="kd-crops"
                    style={{
                      width: "100%", padding: "8px 12px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 10, fontSize: 12,
                      color: "#fff", fontFamily: "'DM Sans', sans-serif",
                      marginBottom: 8,
                    }}
                  />
                  <datalist id="kd-crops">
                    {["Tomato","Wheat","Rice","Cotton","Maize","Potato","Apple","Grape"].map(c =>
                      <option key={c} value={c} />)}
                  </datalist>
                  <button className="kd-btn"
                    onClick={() => file && analyze(file, cropHint)}
                    style={{
                      width: "100%", padding: "9px 0",
                      background: "rgba(74,222,128,0.12)",
                      border: "1px solid rgba(74,222,128,0.3)",
                      borderRadius: 10, color: "#4ade80",
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif", marginBottom: 6,
                      transition: "background .2s",
                    }}>🔄 Re-analyze</button>
                  <button className="kd-btn"
                    onClick={() => { setPreview(null); setResult(null); setFile(null); setError(null); setCropHint(""); }}
                    style={{
                      width: "100%", padding: "8px 0",
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10, color: "rgba(255,255,255,0.35)",
                      fontSize: 12, cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      transition: "background .2s",
                    }}>✕ Clear</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Error ──────────────────────────────────────────── */}
        {error && (
          <div className="kd-fadein" style={{
            background: "rgba(248,113,113,0.1)",
            border: "1px solid rgba(248,113,113,0.3)",
            borderRadius: 14, padding: "12px 16px",
            marginBottom: 20, color: "#fca5a5", fontSize: 13,
          }}>⚠ {error}</div>
        )}

        {/* ── AI badge strip ──────────────────────────────────── */}
        {result?.models_used && (
          <div className="kd-fadein" style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
            <Pill text="✓ PyTorch Disease" color="#4ade80" />
            {result.models_used.quality_pytorch && <Pill text="✓ PyTorch Quality" color="#60a5fa" />}
            {result.models_used.claude_ai && <Pill text="✓ Claude AI" color="#a78bfa" />}
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>
              {result.total_ms}ms
            </span>
          </div>
        )}

        {/* ── Results Grid ────────────────────────────────────── */}
        {d && (
          <div style={{ display: "grid", gridTemplateColumns: q ? "1fr 1fr" : "1fr", gap: 16, marginBottom: 16 }}>

            {/* ── Disease card ─── */}
            <Card className="kd-fadein-2" glow>
              <Label>Disease Detection · रोग पहचान</Label>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h2 style={{
                    fontSize: 22, fontFamily: "'DM Serif Display', serif",
                    color: d.is_healthy ? "#4ade80" : "#fff",
                    fontWeight: 400, letterSpacing: "-0.01em", marginBottom: 2,
                  }}>
                    {d.is_healthy ? "✓ Healthy" : d.disease_class}
                  </h2>
                  {c?.disease_hindi && !d.is_healthy && (
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", fontFamily: "serif" }}>
                      {c.disease_hindi}
                    </p>
                  )}
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                    {d.crop_type}{c?.crop_hindi ? ` · ${c.crop_hindi}` : ""}
                  </p>
                </div>
                {c?.severity && c.severity !== "none" && (
                  <Pill text={c.severity + " risk"} color={SEV_COLOR[c.severity] || "#fbbf24"} />
                )}
              </div>

              {/* Confidence bar */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Model confidence</span>
                  <span style={{ fontSize: 13, fontFamily: "monospace", color: "#fff", fontWeight: 600 }}>
                    {Math.round(d.confidence * 100)}%
                  </span>
                </div>
                <Bar value={d.confidence} color={d.is_healthy ? "#4ade80" : "#fbbf24"} height={8} />
              </div>

              {/* Top 3 predictions */}
              {d.top5?.slice(0, 3).map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{
                    fontSize: 10, color: "rgba(255,255,255,0.25)",
                    width: 18, fontFamily: "monospace"
                  }}>#{i + 1}</span>
                  <span style={{ fontSize: 12, flex: 1, color: i === 0 ? "#e2ffe8" : "rgba(255,255,255,0.5)" }}>
                    {item.class}
                  </span>
                  <div style={{ width: 80 }}>
                    <Bar value={item.confidence} color={i === 0 ? "#4ade80" : "rgba(255,255,255,0.2)"} height={5} />
                  </div>
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.35)", width: 36, textAlign: "right" }}>
                    {Math.round(item.confidence * 100)}%
                  </span>
                </div>
              ))}

              {/* Divider */}
              {c && <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "14px 0" }} />}

              {/* Claude enrichment */}
              {c?.pathogen && (
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
                  <span style={{ color: "rgba(255,255,255,0.6)" }}>Pathogen:</span> {c.pathogen}
                </p>
              )}
              {c?.symptoms_summary && (
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 10, lineHeight: 1.5 }}>
                  {c.symptoms_summary}
                </p>
              )}

              {/* Treatment box */}
              {!d.is_healthy && c?.treatment?.length > 0 && (
                <div style={{
                  background: "rgba(251,191,36,0.08)",
                  border: "1px solid rgba(251,191,36,0.2)",
                  borderRadius: 12, padding: "14px 16px", marginTop: 4,
                }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                    Treatment · उपचार
                  </p>
                  {c.treatment.map((t, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
                      <span style={{ color: "#fbbf24", fontSize: 12, flexShrink: 0 }}>→</span>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>{t}</span>
                    </div>
                  ))}
                  {c.treatment_hindi?.length > 0 && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(251,191,36,0.15)" }}>
                      {c.treatment_hindi.map((t, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                          <span style={{ color: "#fbbf2466", fontSize: 12, flexShrink: 0 }}>→</span>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "serif" }}>{t}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Healthy box */}
              {d.is_healthy && (
                <div style={{
                  background: "rgba(74,222,128,0.08)",
                  border: "1px solid rgba(74,222,128,0.2)",
                  borderRadius: 12, padding: "14px 16px", marginTop: 4,
                }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#4ade80", fontWeight: 600 }}>
                    No disease detected — crop looks healthy! 🎉
                  </p>
                </div>
              )}

              {/* Farmer note from Claude */}
              {c?.farmer_note && (
                <div style={{
                  background: "rgba(167,139,250,0.08)",
                  border: "1px solid rgba(167,139,250,0.2)",
                  borderRadius: 12, padding: "12px 14px", marginTop: 10,
                  display: "flex", gap: 10, alignItems: "flex-start",
                }}>
                  <span style={{ fontSize: 16 }}>💡</span>
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(167,139,250,0.9)", lineHeight: 1.5 }}>
                    {c.farmer_note}
                  </p>
                </div>
              )}
            </Card>

            {/* ── Quality card ─── */}
            {q && (
              <Card className="kd-fadein-3">
                <Label>Quality Grade · गुणवत्ता श्रेणी</Label>

                {/* Grade hero */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                  <div style={{
                    background: (GRADE_COLOR[q.grade] || "#888") + "22",
                    border: `2px solid ${(GRADE_COLOR[q.grade] || "#888")}55`,
                    borderRadius: 14, padding: "10px 18px",
                    boxShadow: `0 0 24px ${(GRADE_COLOR[q.grade] || "#888")}22`,
                  }}>
                    <span style={{
                      fontSize: 22, fontWeight: 800,
                      color: GRADE_COLOR[q.grade] || "#888",
                      fontFamily: "'DM Serif Display', serif",
                    }}>{q.grade_hi || q.grade}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{q.grade}</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                      {Math.round(q.confidence * 100)}% confidence
                    </p>
                  </div>
                </div>

                {/* Grade bars */}
                <div style={{ marginBottom: 16 }}>
                  {q.all_grades?.map((g, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
                      <span style={{
                        width: 72, fontSize: 11, fontWeight: 700,
                        color: GRADE_COLOR[g.label] || "#888",
                      }}>{g.label}</span>
                      <div style={{ flex: 1 }}>
                        <Bar value={g.confidence} color={GRADE_COLOR[g.label] || "#888"} height={7} />
                      </div>
                      <span style={{
                        fontSize: 11, fontFamily: "monospace",
                        color: "rgba(255,255,255,0.35)", width: 36, textAlign: "right",
                      }}>{Math.round(g.confidence * 100)}%</span>
                    </div>
                  ))}
                </div>

                <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 14 }} />

                {/* Market advice */}
                {c?.market_advice && (
                  <div style={{
                    background: "rgba(96,165,250,0.08)",
                    border: "1px solid rgba(96,165,250,0.2)",
                    borderRadius: 12, padding: "12px 14px", marginBottom: 10,
                  }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                      Market Advice
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "rgba(96,165,250,0.85)", lineHeight: 1.5 }}>
                      📦 {c.market_advice}
                    </p>
                  </div>
                )}

                {/* Urgency */}
                {c?.urgency && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Urgency:</span>
                    <Pill
                      text={c.urgency}
                      color={c.urgency === "high" ? "#f87171" : c.urgency === "moderate" ? "#fbbf24" : "#4ade80"}
                    />
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

        {/* ── Prevention strip ─────────────────────────────── */}
        {c?.prevention?.length > 0 && (
          <Card className="kd-fadein-3" style={{ marginBottom: 16 }}>
            <Label>Prevention · रोकथाम</Label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginTop: 6 }}>
              {c.prevention.map((tip, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 10, padding: "10px 12px",
                  fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5,
                  display: "flex", gap: 8, alignItems: "flex-start",
                }}>
                  <span style={{ color: "#4ade8066" }}>◆</span>
                  {tip}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Empty state ──────────────────────────────────── */}
        {!result && !loading && !error && (
          <div className="kd-fadein" style={{ textAlign: "center", padding: "64px 0" }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "rgba(74,222,128,0.06)",
              border: "1px solid rgba(74,222,128,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 36, margin: "0 auto 20px",
              boxShadow: "0 0 40px rgba(74,222,128,0.08)",
            }}>🔍</div>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", marginBottom: 8, fontFamily: "'DM Serif Display', serif" }}>
              Upload a clear crop photo to begin
            </p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", fontFamily: "serif" }}>
              फसल की फोटो अपलोड करें — रोग पहचान और गुणवत्ता जांच के लिए
            </p>

            {/* Feature chips */}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
              {[
                ["🦠", "Disease Detection", "#4ade80"],
                ["⭐", "Quality Grading", "#60a5fa"],
                ["💊", "Treatment Advice", "#fbbf24"],
                ["🗣", "Hindi Support", "#a78bfa"],
              ].map(([icon, label, color]) => (
                <div key={label} style={{
                  background: color + "0f",
                  border: `1px solid ${color}22`,
                  borderRadius: 20, padding: "7px 14px",
                  fontSize: 12, color: color + "cc",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span>{icon}</span> {label}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <style>{`
        @keyframes kd-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}