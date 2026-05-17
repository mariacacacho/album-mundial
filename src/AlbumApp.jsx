import { useState, useEffect, useMemo, useRef } from "react";
import { saveStickers, createShareLink, createShareMissingLink } from './api.js';
import { SECTIONS, TOTAL } from './stickers.js';

export default function AlbumApp({ username, initialOwned, initialRepeats, onLogout }) {
  const [owned, setOwned] = useState(initialOwned);
  const [repeats, setRepeats] = useState(initialRepeats);
  const [tab, setTab] = useState("album");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [shareLink, setShareLink] = useState(null);
  const [shareType, setShareType] = useState('repeats');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveStickers([...owned], repeats).catch(() => {});
    }, 800);
    return () => clearTimeout(saveTimer.current);
  }, [owned, repeats]);

  const toggle = (id) => {
    if (owned.has(id)) {
      setOwned((prev) => { const next = new Set(prev); next.delete(id); return next; });
      setRepeats((prev) => { const { [id]: _, ...rest } = prev; return rest; });
    } else {
      setOwned((prev) => { const next = new Set(prev); next.add(id); return next; });
    }
  };

  const addRepeat = (id, e) => {
    e.stopPropagation();
    setRepeats((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  };

  const removeRepeat = (id, e) => {
    e.stopPropagation();
    setRepeats((prev) => {
      if ((prev[id] ?? 0) <= 1) { const { [id]: _, ...rest } = prev; return rest; }
      return { ...prev, [id]: prev[id] - 1 };
    });
  };

  const clearAllRepeats = (id) => {
    setRepeats((prev) => { const { [id]: _, ...rest } = prev; return rest; });
  };

  const markSection = (stickers) => {
    setOwned((prev) => {
      const next = new Set(prev);
      stickers.forEach((s) => next.add(s));
      return next;
    });
  };

  const clearSection = (stickers) => {
    setOwned((prev) => {
      const next = new Set(prev);
      stickers.forEach((s) => next.delete(s));
      return next;
    });
    setRepeats((prev) => {
      const next = { ...prev };
      stickers.forEach((s) => delete next[s]);
      return next;
    });
  };

  const resetAll = () => {
    if (confirm("¿Borrar todo el progreso?")) {
      setOwned(new Set());
      setRepeats({});
    }
  };

  const generateShareLink = async () => {
    setShareLoading(true);
    setShareError(null);
    setShareType('repeats');
    try {
      const { shareId } = await createShareLink();
      const fullUrl = `${window.location.origin}/share/${shareId}`;
      setShareLink(fullUrl);
    } catch (e) {
      setShareError(e.message);
    } finally {
      setShareLoading(false);
    }
  };

  const generateShareMissingLink = async () => {
    setShareLoading(true);
    setShareError(null);
    setShareType('missing');
    try {
      const allStickers = SECTIONS.flatMap((sec) => sec.stickers);
      const missingIds = allStickers.filter((id) => !owned.has(id));
      const { shareId } = await createShareMissingLink(missingIds);
      const fullUrl = `${window.location.origin}/share/${shareId}`;
      setShareLink(fullUrl);
    } catch (e) {
      setShareError(e.message);
    } finally {
      setShareLoading(false);
    }
  };

  const copyShareLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      alert('¡Link copiado al portapapeles! 📋');
    }
  };

  const closeShareModal = () => {
    setShareLink(null);
    setShareError(null);
  };

  const visibleSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SECTIONS
      .filter((sec) => !q || sec.name.toLowerCase().includes(q))
      .map((sec) => {
        let visible = sec.stickers;
        if (filter === "owned")   visible = visible.filter((s) => owned.has(s));
        if (filter === "missing") visible = visible.filter((s) => !owned.has(s));
        return { ...sec, visible };
      })
      .filter((sec) => sec.visible.length > 0);
  }, [filter, search, owned]);

  const repeatEntries = useMemo(() => {
    return Object.entries(repeats).filter(([, count]) => count > 0);
  }, [repeats]);

  const repeatsBySection = useMemo(() => {
    if (repeatEntries.length === 0) return [];
    return SECTIONS
      .map((sec) => {
        const items = sec.stickers.filter((id) => repeats[id] > 0);
        return items.length > 0 ? { ...sec, items } : null;
      })
      .filter(Boolean);
  }, [repeatEntries, repeats]);

  const totalExtraCount = repeatEntries.reduce((sum, [, c]) => sum + c, 0);

  const pct = Math.round((owned.size / TOTAL) * 100);

  return (
    <div style={s.root}>
      <header style={s.header}>
        <div style={s.trophy}>🏆</div>
        <h1 style={s.title}>Álbum Mundial</h1>
        <p style={s.subtitle}>FIFA World Cup 2026</p>
        <div style={s.userRow}>
          <span style={s.userChip}>👤 {username}</span>
          <button style={s.logoutBtn} onClick={onLogout}>Salir</button>
        </div>
      </header>

      <div style={s.progressCard}>
        <div style={s.progressTop}>
          <span style={s.progressLabel}>Progreso total</span>
          <span style={s.progressCount}>
            <b style={s.ownedNum}>{owned.size}</b>
            <span style={s.totalNum}> / {TOTAL}</span>
          </span>
        </div>
        <div style={s.barBg}>
          <div style={{ ...s.barFill, width: `${pct}%` }} />
        </div>
        <div style={s.pct}>{pct}% completado</div>
      </div>

      <div style={s.tabRow}>
        <button
          style={{ ...s.tabBtn, ...(tab === "album" ? s.tabActive : {}) }}
          onClick={() => setTab("album")}
        >
          Álbum
        </button>
        <button
          style={{ ...s.tabBtn, ...(tab === "repetidas" ? s.tabActive : {}) }}
          onClick={() => setTab("repetidas")}
        >
          🔁 Repetidas
          {totalExtraCount > 0 && <span style={s.tabBadge}>{totalExtraCount}</span>}
        </button>
      </div>

      {tab === "album" && (
        <div style={s.controls}>
          <input
            style={s.searchInput}
            placeholder="🔍 Buscar país o sección..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div style={s.filterRow}>
            {["all", "owned", "missing"].map((f) => (
              <button
                key={f}
                style={{ ...s.filterBtn, ...(filter === f ? s.filterActive : {}) }}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "Todas" : f === "owned" ? "✅ Tengo" : "❌ Faltan"}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "album" && (
        <>
          <div style={s.statsRow}>
            <div style={s.statChip}>
              <span style={s.statNum}>{owned.size}</span>
              <span style={s.statLabel}>Tengo</span>
            </div>
            <div style={s.statChip}>
              <span style={{ ...s.statNum, color: "#f87171" }}>{TOTAL - owned.size}</span>
              <span style={s.statLabel}>Faltan</span>
            </div>
            <button
              style={s.shareMissingBtn}
              onClick={generateShareMissingLink}
              disabled={shareLoading || owned.size === TOTAL}
              title="Compartir mis estampas faltantes"
            >
              <span style={s.shareMissingIcon}>
                {shareLoading && shareType === 'missing' ? '⏳' : '🔗'}
              </span>
              <span style={s.statLabel}>Compartir faltantes</span>
            </button>
            <button style={s.resetBtn} onClick={resetAll}>Reiniciar</button>
          </div>

          <div style={s.sections}>
            {visibleSections.map((sec) => {
              const sectionOwned = sec.stickers.filter((id) => owned.has(id)).length;
              const complete = sectionOwned === sec.stickers.length;
              return (
                <div key={sec.id} style={s.section}>
                  <div style={s.sectionHeader}>
                    <div style={s.sectionInfo}>
                      {sec.iso
                        ? <span className={`fi fi-${sec.iso}`} style={s.sectionFlag} />
                        : <span style={s.sectionEmoji}>{sec.emoji}</span>}
                      <span style={s.sectionName}>{sec.name}</span>
                      <span style={{ ...s.sectionCount, ...(complete ? s.sectionCountDone : {}) }}>
                        {sectionOwned}/{sec.stickers.length}
                      </span>
                    </div>
                    <div style={s.sectionActions}>
                      <button style={s.markAllBtn} onClick={() => markSection(sec.stickers)}>✓ Todo</button>
                      <button style={s.clearBtn}   onClick={() => clearSection(sec.stickers)}>✗</button>
                    </div>
                  </div>

                  <div style={s.grid}>
                    {sec.visible.map((id) => {
                      const has = owned.has(id);
                      const extra = repeats[id] ?? 0;
                      const label = sec.type === 'country' ? id.replace(/^[A-Z]+/, '') : id;
                      if (!has) {
                        return (
                          <button
                            key={id}
                            onClick={() => toggle(id)}
                            style={{ ...s.stamp, ...s.stampMissing }}
                            title={`${id} — Me falta`}
                          >
                            {label}
                          </button>
                        );
                      }
                      return (
                        <div key={id} style={s.stampOwned}>
                          <button
                            onClick={() => toggle(id)}
                            style={s.stampTop}
                            title={`${id} — Tengo ${extra + 1} copia${extra + 1 > 1 ? 's' : ''}`}
                          >
                            {label}
                          </button>
                          <div style={s.repeatRow}>
                            {extra > 0 && (
                              <button style={s.repeatBtn} onClick={(e) => removeRepeat(id, e)}>−</button>
                            )}
                            <span style={s.repeatCount}>×{extra + 1}</span>
                            <button style={s.repeatBtn} onClick={(e) => addRepeat(id, e)}>+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {visibleSections.length === 0 && (
              <div style={s.empty}>No hay estampas con ese criterio 🤷</div>
            )}
          </div>
        </>
      )}

      {tab === "repetidas" && (
        <div style={s.sections}>
          {repeatsBySection.length === 0 ? (
            <div style={s.empty}>No tenés estampas repetidas todavía 🙌</div>
          ) : (
            <>
              <div style={s.repeatsHeader}>
                <span style={s.repeatsHeaderText}>🔁 Repetidas</span>
                <div style={s.repeatsActions}>
                  <span style={s.repeatsCount}>{totalExtraCount} extra{totalExtraCount !== 1 ? 's' : ''}</span>
                  <button 
                    style={s.shareBtn} 
                    onClick={generateShareLink}
                    disabled={shareLoading}
                  >
                    {shareLoading ? '⏳' : '🔗'} Compartir
                  </button>
                </div>
              </div>
              {repeatsBySection.map((sec) => (
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
                    {sec.items.map((id) => {
                      const extra = repeats[id];
                      return (
                        <div key={id} style={s.chip}>
                          <span style={s.chipId}>{id}</span>
                          <button style={s.chipCountBtn} onClick={(e) => removeRepeat(id, e)}>−</button>
                          <span style={s.chipCount}>×{extra + 1}</span>
                          <button style={s.chipCountBtn} onClick={(e) => addRepeat(id, e)}>+</button>
                          <button style={s.chipClose} onClick={() => clearAllRepeats(id)} title="Quitar todas las repetidas">×</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {shareLink && (
        <div style={s.modalOverlay} onClick={closeShareModal}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>🔗 Link para Compartir</h3>
              <button style={s.modalClose} onClick={closeShareModal}>×</button>
            </div>
            <p style={s.modalText}>
              {shareType === 'missing'
                ? 'Compartí este link con tus amigos para mostrarles tus estampas faltantes:'
                : 'Compartí este link con tus amigos para mostrarles tus estampas repetidas:'}
            </p>
            <div style={s.linkBox}>
              <input 
                type="text" 
                value={shareLink} 
                readOnly 
                style={s.linkInput}
                onClick={(e) => e.target.select()}
              />
            </div>
            <div style={s.modalActions}>
              <button style={s.copyBtn} onClick={copyShareLink}>
                📋 Copiar Link
              </button>
              <button style={s.closeBtn} onClick={closeShareModal}>
                Cerrar
              </button>
            </div>
            <p style={s.modalNote}>
              💡 El link expira en 30 días
            </p>
          </div>
        </div>
      )}

      {shareError && (
        <div style={s.modalOverlay} onClick={() => setShareError(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>⚠️ Error</h3>
              <button style={s.modalClose} onClick={() => setShareError(null)}>×</button>
            </div>
            <p style={s.errorText}>{shareError}</p>
            <button style={s.closeBtn} onClick={() => setShareError(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
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
  subtitle: { margin: "6px 0 8px", color: "#94a3b8", fontSize: 14 },
  userRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 8 },
  userChip: {
    fontSize: 13, color: "#a5b4fc",
    background: "rgba(99,102,241,0.15)",
    padding: "4px 12px", borderRadius: 99,
    border: "1px solid rgba(99,102,241,0.3)",
  },
  logoutBtn: {
    fontSize: 12, color: "#94a3b8",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 99, padding: "4px 12px", cursor: "pointer",
  },
  progressCard: {
    margin: "20px 16px 0",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16, padding: "18px 20px",
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
    padding: "11px 16px", borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#e2e8f0", fontSize: 15, outline: "none",
  },
  filterRow: { display: "flex", gap: 8 },
  filterBtn: {
    flex: 1, padding: "9px 4px", borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)",
    color: "#94a3b8", fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  filterActive: {
    background: "linear-gradient(135deg, #6366f1, #a855f7)",
    color: "#fff", border: "1px solid transparent",
  },
  statsRow: { display: "flex", alignItems: "center", gap: 10, margin: "14px 16px 0" },
  statChip: {
    flex: 1, background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 12, padding: "10px 0", textAlign: "center",
  },
  statNum: { display: "block", fontSize: 22, fontWeight: 800, color: "#86efac" },
  statLabel: { fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" },
  resetBtn: {
    padding: "10px 14px", borderRadius: 12,
    border: "1px solid rgba(248,113,113,0.3)",
    background: "rgba(248,113,113,0.1)",
    color: "#f87171", fontWeight: 700, fontSize: 12, cursor: "pointer",
  },
  sections: { margin: "16px 16px 0", display: "flex", flexDirection: "column", gap: 12 },
  section: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14, overflow: "hidden",
  },
  sectionHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 14px",
    background: "rgba(99,102,241,0.1)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  sectionInfo: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
  sectionEmoji: { fontSize: 20, flexShrink: 0 },
  sectionFlag: { width: 20, height: 15, flexShrink: 0, borderRadius: 2 },
  sectionName: { fontSize: 14, fontWeight: 700, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  sectionCount: { fontSize: 12, color: "#64748b", fontWeight: 600, flexShrink: 0 },
  sectionCountDone: { color: "#86efac" },
  sectionActions: { display: "flex", gap: 6, flexShrink: 0 },
  markAllBtn: {
    fontSize: 11, fontWeight: 700, cursor: "pointer",
    padding: "4px 10px", borderRadius: 8,
    background: "rgba(99,102,241,0.2)",
    border: "1px solid rgba(99,102,241,0.35)",
    color: "#a5b4fc",
  },
  clearBtn: {
    fontSize: 11, fontWeight: 700, cursor: "pointer",
    padding: "4px 8px", borderRadius: 8,
    background: "rgba(248,113,113,0.1)",
    border: "1px solid rgba(248,113,113,0.25)",
    color: "#f87171",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(48px, 1fr))",
    gap: 5, padding: "10px",
  },
  // Missing stamp: plain button, misma altura que el owned
  stamp: {
    height: 58, borderRadius: 8, border: "none",
    fontSize: 11, fontWeight: 700, cursor: "pointer",
  },
  stampMissing: {
    background: "rgba(255,255,255,0.06)",
    color: "#475569", border: "1px solid rgba(255,255,255,0.07)",
  },
  // Owned stamp: wrapper div con altura fija igual al missing
  stampOwned: {
    height: 58, borderRadius: 8,
    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
    boxShadow: "0 2px 6px rgba(99,102,241,0.45)",
    display: "flex", flexDirection: "column",
    overflow: "hidden",
  },
  stampTop: {
    flex: 1,
    background: "none", border: "none",
    color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    overflow: "hidden",
    padding: "0 2px",
  },
  repeatRow: {
    height: 20,
    flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 2,
    background: "rgba(0,0,0,0.25)",
  },
  repeatBtn: {
    background: "rgba(255,255,255,0.15)",
    border: "none", borderRadius: 4,
    color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer",
    width: 16, height: 16, lineHeight: 1,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 0,
  },
  repeatCount: {
    fontSize: 10, fontWeight: 700, color: "#e0e7ff",
    minWidth: 18, textAlign: "center",
  },
  empty: { textAlign: "center", color: "#64748b", padding: 40, fontSize: 15 },

  // Tabs
  tabRow: {
    display: "flex", margin: "16px 16px 0",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12, padding: 4, gap: 4,
  },
  tabBtn: {
    flex: 1, padding: "9px 8px", borderRadius: 9,
    border: "none", background: "none",
    color: "#64748b", fontSize: 14, fontWeight: 600, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  },
  tabActive: {
    background: "rgba(99,102,241,0.25)",
    color: "#a5b4fc",
    border: "1px solid rgba(99,102,241,0.3)",
  },
  tabBadge: {
    background: "rgba(99,102,241,0.4)",
    color: "#c7d2fe",
    fontSize: 11, fontWeight: 700,
    borderRadius: 99, padding: "1px 6px",
    minWidth: 18, textAlign: "center",
  },

  // Repetidas tab
  repeatsHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 4px",
  },
  repeatsHeaderText: { fontSize: 15, fontWeight: 700, color: "#fde68a" },
  repeatsCount: {
    fontSize: 12, fontWeight: 600, color: "#92400e",
    background: "rgba(251,191,36,0.2)",
    padding: "2px 8px", borderRadius: 99,
  },
  repeatsChips: { display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 12px 10px" },
  chip: {
    display: "flex", alignItems: "center", gap: 4,
    background: "rgba(99,102,241,0.15)",
    border: "1px solid rgba(99,102,241,0.3)",
    borderRadius: 8, padding: "4px 8px",
  },
  chipId: { fontSize: 12, fontWeight: 700, color: "#a5b4fc" },
  chipCountBtn: {
    background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 4,
    color: "#a5b4fc", fontSize: 12, fontWeight: 700, cursor: "pointer",
    width: 18, height: 18, lineHeight: 1,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
  },
  chipCount: { fontSize: 12, color: "#c7d2fe", fontWeight: 700, minWidth: 22, textAlign: "center" },
  chipClose: {
    background: "none", border: "none", cursor: "pointer",
    color: "#475569", fontSize: 14, lineHeight: 1, padding: "0 0 0 2px",
    fontWeight: 700,
  },

  // Share functionality
  repeatsActions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  shareBtn: {
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    padding: "4px 10px",
    borderRadius: 8,
    background: "rgba(59,130,246,0.2)",
    border: "1px solid rgba(59,130,246,0.4)",
    color: "#93c5fd",
  },
  shareMissingBtn: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 12,
    padding: "10px 0",
    cursor: "pointer",
  },
  shareMissingIcon: {
    display: "block",
    fontSize: 22,
    lineHeight: 1.2,
    fontWeight: 800,
  },

  // Modal
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 1000,
  },
  modal: {
    background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
    border: "1px solid rgba(99,102,241,0.3)",
    borderRadius: 16,
    padding: 24,
    maxWidth: 500,
    width: "100%",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: "#e2e8f0",
  },
  modalClose: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: 28,
    lineHeight: 1,
    cursor: "pointer",
    padding: 0,
    width: 32,
    height: 32,
  },
  modalText: {
    margin: "0 0 16px",
    fontSize: 14,
    color: "#cbd5e1",
    lineHeight: 1.5,
  },
  linkBox: {
    marginBottom: 16,
  },
  linkInput: {
    width: "100%",
    padding: "12px",
    borderRadius: 8,
    border: "1px solid rgba(99,102,241,0.3)",
    background: "rgba(15,23,42,0.6)",
    color: "#e2e8f0",
    fontSize: 13,
    fontFamily: "monospace",
    outline: "none",
  },
  modalActions: {
    display: "flex",
    gap: 10,
    marginBottom: 12,
  },
  copyBtn: {
    flex: 1,
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    background: "linear-gradient(135deg, #6366f1, #a855f7)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  closeBtn: {
    flex: 1,
    padding: "10px 16px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.1)",
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  modalNote: {
    margin: 0,
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
  errorText: {
    margin: "0 0 16px",
    fontSize: 14,
    color: "#fca5a5",
    lineHeight: 1.5,
  },
};
