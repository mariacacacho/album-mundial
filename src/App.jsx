import { useState, useEffect } from 'react';
import Auth from './Auth.jsx';
import AlbumApp from './AlbumApp.jsx';
import SharedRepeats from './SharedRepeats.jsx';
import { getUsername, clearToken, clearUsername, fetchStickers } from './api.js';

export default function App() {
  const [username, setUsername] = useState(getUsername);
  const [initialData, setInitialData] = useState(null);

  // Check if viewing a shared link
  const path = window.location.pathname;
  const shareMatch = path.match(/^\/share\/([a-f0-9]+)$/);
  const shareId = shareMatch ? shareMatch[1] : null;

  useEffect(() => {
    if (!username || shareId) return;
    fetchStickers()
      .then((data) => setInitialData({ owned: new Set(data.owned), repeats: data.repeats ?? {} }))
      .catch(() => {
        clearToken();
        clearUsername();
        setUsername(null);
      });
  }, [username, shareId]);

  const handleAuth = (u) => {
    setUsername(u);
    setInitialData(null);
  };

  const handleLogout = () => {
    clearToken();
    clearUsername();
    setUsername(null);
    setInitialData(null);
  };

  const handleBackFromShare = () => {
    window.location.href = '/';
  };

  // If viewing a shared link
  if (shareId) {
    return <SharedRepeats shareId={shareId} onBack={username ? handleBackFromShare : null} />;
  }

  if (!username) return <Auth onAuth={handleAuth} />;

  if (initialData === null) return <Loading />;

  return <AlbumApp username={username} initialOwned={initialData.owned} initialRepeats={initialData.repeats} onLogout={handleLogout} />;
}

function Loading() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a, #1e1b4b)',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <p style={{ color: '#94a3b8', fontSize: 16 }}>Cargando…</p>
    </div>
  );
}
