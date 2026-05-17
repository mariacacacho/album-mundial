import { useState, useEffect, useMemo } from "react";
import { getSharedRepeats } from './api.js';
import { SECTIONS } from './stickers.js';

export default function SharedRepeats({ shareId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    const loadSharedData = async () => {
      try {
        setLoading(true);
        const result = await getSharedRepeats(shareId);
        setData(result);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    loadSharedData();
  }, [shareId]);

  const isMissing = data?.type === 'missing';

  const sectionItems = useMemo(() => {
    if (!data) return [];
    if (isMissing) {
      const missingSet = new Set(data.missing ?? []);
      return SECTIONS
        .map((sec) => {
          const items = sec.stickers.filter((id) => missingSet.has(id));
          return items.length > 0 ? { ...sec, items } : null;
        })
        .filter(Boolean);
    }
    const repeats = data.repeats ?? {};
    return SECTIONS
      .map((sec) => {
        const items = sec.stickers.filter((id) => repeats[id] > 0);
        return items.length > 0 ? { ...sec, items } : null;
      })
      .filter(Boolean);
  }, [data, isMissing]);

  const totalExtraCount = useMemo(() => {
    if (!data?.repeats) return 0;
    return Object.values(data.repeats).reduce((sum, c) => sum + c, 0);
  }, [data]);

  const totalMissingCount = useMemo(() => {
    return data?.missing?.length ?? 0;
  }, [data]);

  if (loading) {
    return (
      <div style={s.root}>
        <div style={s.loading}>
          <div style={s.spinner}>⏳</div>
          <p style={s.loadingText}>Cargando estampas compartidas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={s.root}>
        <div style={s.errorCard}>
          <div style={s.errorIcon}>⚠️</div>
          <h2 style={s.errorTitle}>Error</h2>
          <p style={s.errorMessage}>{error}</p>
          {onBack && (
            <button style={s.backBtn} onClick={onBack}>
              ← Volver a mi álbum
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={s.root}>
      <header style={s.header}>
        <div style={s.trophy}>{isMissing ? '❌' : '🔁'}</div>
        <h1 style={s.title}>{isMissing ? 'Estampas Faltantes' : 'Estampas Repetidas'}</h1>
        <p style={s.subtitle}>Compartidas por {data.username}</p>
        {onBack && (
          <button style={s.backBtn} onClick={onBack}>
            ← Volver a mi álbum
          </button>
        )}
      </header>

      <div style={s.infoCard}>
        <div style={s.infoRow}>
          <span style={s.infoLabel}>👤 Usuario:</span>
          <span style={s.infoValue}>{data.username}</span>
        </div>
        <div style={s.infoRow}>
          {isMissing ? (
            <>
              <span style={s.infoLabel}>❌ Total faltantes:</span>
              <span style={s.infoValue}>{totalMissingCount}</span>
            </>
          ) : (
            <>
              <span style={s.infoLabel}>🔁 Total de extras:</span>
              <span style={s.infoValue}>{totalExtraCount}</span>
            </>
          )}
        </div>
      </div>

      <div style={s.sections}>
        {sectionItems.length === 0 ? (
          <div style={s.empty}>
            {isMissing ? '¡No faltan estampas! Álbum completo 🏆' : 'No hay estampas repetidas disponibles 🤷'}
          </div>
        ) : (
          <>
            <div style={s.repeatsHeader}>
              {isMissing ? (
                <>
                  <span style={{ ...s.repeatsHeaderText, color: '#f87171' }}>❌ Estampas Faltantes</span>
                  <span style={{ ...s.repeatsCount, color: '#991b1b', background: 'rgba(248,113,113,0.15)' }}>
                    {totalMissingCount} faltante{totalMissingCount !== 1 ? 's' : ''}
                  </span>
                </>
              ) : (
                <>
                  <span style={s.repeatsHeaderText}>🔁 Repetidas Disponibles</span>
                  <span style={s.repeatsCount}>{totalExtraCount} extra{totalExtraCount !== 1 ? 's' : ''}</span>
                </>
              )}
            </div>
            {sectionItems.map((sec) => (
              <div key={sec.id} style={s.section}>
                <div style={s.sectionHeader}>
                  <div style={s.sectionInfo}>
                    {sec.iso
                      ? <span className={`fi fi-${sec.iso}`} style={s.sectionFlag} />
                      : <span style={s.sectionEmoji}>{sec.emoji}</span>}
                    <span style={s.sectionName}>{sec.name}</span>
                  </div>
                </div>
                <div style={s.repeatsChips}>
                  {sec.items.map((id) => (
                    isMissing ? (
                      <div key={id} style={{ ...s.chip, ...s.chipMissing }}>
                        <span style={{ ...s.chipId, color: '#fca5a5' }}>{id}</span>
                      </div>
                    ) : (
                      <div key={id} style={s.chip}>
                        <span style={s.chipId}>{id}</span>
                        <span style={s.chipCount}>×{data.repeats[id] + 1}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
    color: "#e2e8f0",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    paddingBottom: 60,
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    gap: 16,
  },
  spinner: {
    fontSize: 48,
    animation: "spin 2s linear infinite",
  },
  loadingText: {
    fontSize: 16,
    color: "#94a3b8",
  },
  errorCard: {
    margin: "60px 16px",
    background: "rgba(248,113,113,0.1)",
    border: "1px solid rgba(248,113,113,0.3)",
    borderRadius: 16,
    padding: "32px 20px",
    textAlign: "center",
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorTitle: {
    margin: "0 0 12px",
    fontSize: 24,
    fontWeight: 700,
    color: "#f87171",
  },
  errorMessage: {
    margin: "0 0 20px",
    fontSize: 15,
    color: "#94a3b8",
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
  subtitle: { margin: "6px 0 12px", color: "#94a3b8", fontSize: 14 },
  backBtn: {
    marginTop: 12,
    padding: "8px 16px",
    borderRadius: 8,
    border: "1px solid rgba(99,102,241,0.3)",
    background: "rgba(99,102,241,0.15)",
    color: "#a5b4fc",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
  },
  infoCard: {
    margin: "20px 16px 0",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: 600,
  },
  infoValue: {
    fontSize: 15,
    color: "#e2e8f0",
    fontWeight: 700,
  },
  sections: { margin: "16px 16px 0", display: "flex", flexDirection: "column", gap: 12 },
  section: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    overflow: "hidden",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    background: "rgba(99,102,241,0.1)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  sectionInfo: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
  sectionEmoji: { fontSize: 20, flexShrink: 0 },
  sectionFlag: { width: 20, height: 15, flexShrink: 0, borderRadius: 2 },
  sectionName: {
    fontSize: 14,
    fontWeight: 700,
    color: "#e2e8f0",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  empty: { textAlign: "center", color: "#64748b", padding: 40, fontSize: 15 },
  repeatsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 4px",
  },
  repeatsHeaderText: { fontSize: 15, fontWeight: 700, color: "#fde68a" },
  repeatsCount: {
    fontSize: 12,
    fontWeight: 600,
    color: "#92400e",
    background: "rgba(251,191,36,0.2)",
    padding: "2px 8px",
    borderRadius: 99,
  },
  repeatsChips: { display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 12px 10px" },
  chip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(99,102,241,0.15)",
    border: "1px solid rgba(99,102,241,0.3)",
    borderRadius: 8,
    padding: "6px 12px",
  },
  chipId: { fontSize: 12, fontWeight: 700, color: "#a5b4fc" },
  chipCount: { fontSize: 12, color: "#c7d2fe", fontWeight: 700 },
  chipMissing: {
    background: "rgba(248,113,113,0.1)",
    border: "1px solid rgba(248,113,113,0.25)",
  },
};
