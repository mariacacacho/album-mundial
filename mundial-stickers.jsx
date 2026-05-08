import { useState, useEffect, useMemo } from "react";

const TOTAL = 980;

function getInitialState() {
  try {
    const saved = localStorage.getItem("mundial_stickers");
    if (saved) return new Set(JSON.parse(saved));
  } catch {}
  return new Set();
}

export default function App() {
  const [owned, setOwned] = useState(getInitialState);
  const [filter, setFilter] = useState("all"); // all | owned | missing
  const [search, setSearch] = useState("");
  const [rangeInput, setRangeInput] = useState("");
  const [rangeMsg, setRangeMsg] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem("mundial_stickers", JSON.stringify([...owned]));
    } catch {}
  }, [owned]);

  const toggle = (n) => {
    setOwned((prev) => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });
  };

  const applyRange = () => {
    const match = rangeInput.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (!match) { setRangeMsg("Formato: 1-50"); return; }
    let [, a, b] = match.map(Number);
    if (a > b) [a, b] = [b, a];
    if (b > TOTAL) b = TOTAL;
    setOwned((prev) => {
      const next = new Set(prev);
      for (let i = a; i <= b; i++) next.add(i);
      return next;
    });
    setRangeMsg(`✓ ${a}–${b} marcadas`);
    setRangeInput("");
    setTimeout(() => setRangeMsg(""), 2500);
  };

  const resetAll = () => {
    if (confirm("¿Borrar todo el progreso?")) setOwned(new Set());
  };

  const numbers = useMemo(() => {
    const q = search.trim();
    let list = Array.from({ length: TOTAL }, (_, i) => i + 1);
    if (q) {
      const n = parseInt(q);
      if (!isNaN(n)) list = list.filter((x) => String(x).includes(q));
    }
    if (filter === "owned") list = list.filter((x) => owned.has(x));
    if (filter === "missing") list = list.filter((x) => !owned.has(x));
    return list;
  }, [filter, search, owned]);

  const pct = Math.round((owned.size / TOTAL) * 100);

  return (
    <div style={styles.root}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.trophy}>🏆</div>
        <h1 style={styles.title}>Álbum Mundial</h1>
        <p style={styles.subtitle}>Marca tus estampas</p>
      </header>

      {/* Progress bar */}
      <div style={styles.progressCard}>
        <div style={styles.progressTop}>
          <span style={styles.progressLabel}>Progreso</span>
          <span style={styles.progressCount}>
            <b style={styles.ownedNum}>{owned.size}</b>
            <span style={styles.totalNum}> / {TOTAL}</span>
          </span>
        </div>
        <div style={styles.barBg}>
          <div style={{ ...styles.barFill, width: `${pct}%` }} />
        </div>
        <div style={styles.pct}>{pct}% completado</div>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <input
          style={styles.searchInput}
          placeholder="🔍 Buscar número..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          type="number"
          min={1}
          max={TOTAL}
        />

        <div style={styles.filterRow}>
          {["all", "owned", "missing"].map((f) => (
            <button
              key={f}
              style={{ ...styles.filterBtn, ...(filter === f ? styles.filterActive : {}) }}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "Todas" : f === "owned" ? "✅ Tengo" : "❌ Faltan"}
            </button>
          ))}
        </div>

        <div style={styles.rangeRow}>
          <input
            style={styles.rangeInput}
            placeholder="Rango: ej. 1-50"
            value={rangeInput}
            onChange={(e) => setRangeInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyRange()}
          />
          <button style={styles.rangeBtn} onClick={applyRange}>Marcar rango</button>
        </div>
        {rangeMsg && <div style={styles.rangeMsg}>{rangeMsg}</div>}
      </div>

      {/* Stats mini */}
      <div style={styles.statsRow}>
        <div style={styles.statChip}>
          <span style={styles.statNum}>{owned.size}</span>
          <span style={styles.statLabel}>Tengo</span>
        </div>
        <div style={styles.statChip}>
          <span style={{ ...styles.statNum, color: "#f87171" }}>{TOTAL - owned.size}</span>
          <span style={styles.statLabel}>Faltan</span>
        </div>
        <button style={styles.resetBtn} onClick={resetAll}>Reiniciar</button>
      </div>

      {/* Grid */}
      <div style={styles.showing}>
        Mostrando {numbers.length} estampas
      </div>
      <div style={styles.grid}>
        {numbers.map((n) => {
          const has = owned.has(n);
          return (
            <button
              key={n}
              onClick={() => toggle(n)}
              style={{
                ...styles.stamp,
                ...(has ? styles.stampOwned : styles.stampMissing),
              }}
              title={`Estampa #${n} — ${has ? "La tengo" : "Me falta"}`}
            >
              {n}
            </button>
          );
        })}
      </div>

      {numbers.length === 0 && (
        <div style={styles.empty}>No hay estampas con ese criterio 🤷</div>
      )}
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
    color: "#e2e8f0",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: "0 0 60px",
  },
  header: {
    textAlign: "center",
    padding: "36px 16px 20px",
    background: "linear-gradient(180deg, rgba(99,102,241,0.25) 0%, transparent 100%)",
    borderBottom: "1px solid rgba(99,102,241,0.2)",
  },
  trophy: { fontSize: 48, lineHeight: 1, marginBottom: 8 },
  title: {
    margin: 0,
    fontSize: "clamp(1.8rem, 6vw, 2.8rem)",
    fontWeight: 800,
    letterSpacing: "-0.03em",
    background: "linear-gradient(90deg, #a5b4fc, #f0abfc)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: { margin: "6px 0 0", color: "#94a3b8", fontSize: 14 },

  progressCard: {
    margin: "20px 16px 0",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: "18px 20px",
  },
  progressTop: { display: "flex", justifyContent: "space-between", marginBottom: 10 },
  progressLabel: { fontSize: 13, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" },
  progressCount: { fontSize: 16 },
  ownedNum: { fontSize: 22, fontWeight: 800, color: "#a5b4fc" },
  totalNum: { color: "#64748b" },
  barBg: { height: 10, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #6366f1, #a855f7)", transition: "width 0.4s ease" },
  pct: { marginTop: 8, fontSize: 12, color: "#64748b", textAlign: "right" },

  controls: { margin: "16px 16px 0", display: "flex", flexDirection: "column", gap: 10 },
  searchInput: {
    padding: "11px 16px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#e2e8f0",
    fontSize: 15,
    outline: "none",
  },
  filterRow: { display: "flex", gap: 8 },
  filterBtn: {
    flex: 1,
    padding: "9px 4px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)",
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  filterActive: {
    background: "linear-gradient(135deg, #6366f1, #a855f7)",
    color: "#fff",
    border: "1px solid transparent",
  },
  rangeRow: { display: "flex", gap: 8 },
  rangeInput: {
    flex: 1,
    padding: "11px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#e2e8f0",
    fontSize: 14,
    outline: "none",
  },
  rangeBtn: {
    padding: "11px 16px",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #6366f1, #a855f7)",
    color: "#fff",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  rangeMsg: { fontSize: 13, color: "#86efac", fontWeight: 600, textAlign: "center", padding: "2px 0" },

  statsRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "14px 16px 0",
  },
  statChip: {
    flex: 1,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 12,
    padding: "10px 0",
    textAlign: "center",
  },
  statNum: { display: "block", fontSize: 22, fontWeight: 800, color: "#86efac" },
  statLabel: { fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" },
  resetBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(248,113,113,0.3)",
    background: "rgba(248,113,113,0.1)",
    color: "#f87171",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
  },

  showing: { margin: "14px 16px 8px", fontSize: 12, color: "#475569" },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))",
    gap: 6,
    padding: "0 16px",
  },
  stamp: {
    aspectRatio: "1",
    borderRadius: 10,
    border: "none",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    transition: "transform 0.1s, box-shadow 0.1s",
  },
  stampOwned: {
    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
    color: "#fff",
    boxShadow: "0 2px 8px rgba(99,102,241,0.5)",
  },
  stampMissing: {
    background: "rgba(255,255,255,0.06)",
    color: "#475569",
    border: "1px solid rgba(255,255,255,0.07)",
  },
  empty: { textAlign: "center", color: "#64748b", padding: 40, fontSize: 15 },
};
