import { useState } from 'react';
import LayoutForm       from './components/sidebar/LayoutForm';
import ObjectInspector  from './components/sidebar/ObjectInspector';
import TopViewSvg       from './components/viewer2d/TopViewSvg';
import ThreeDViewer     from './components/viewer3d/index';
import ScorePanel       from './components/ScorePanel';
import { generateLandscapeDesign } from './api/landscapeApi';
import './index.css';


export default function App() {
  const [layout, setLayout] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('2d');
  const [error, setError] = useState(null);

  const handleGenerate = async (formData) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateLandscapeDesign(formData);
      setLayout(result);
      setActiveTab('2d');
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to connect to the backend. Is the server running?'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-shell">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="logo-icon">🌿</div>
        <h1>AI Landscape Designer</h1>
        <span className="subtitle">Powered by Gemini · Vastu-aware · 3D Interactive</span>
      </header>

      <div className="app-body">
        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sidebar-top">
            <LayoutForm onGenerate={handleGenerate} isLoading={isLoading} />
          </div>
          <ObjectInspector layout={layout} />
        </aside>



        {/* ── Main Viewer ── */}
        <main className="viewer-area">
          {/* View Tabs */}
          <div className="view-tabs">
            <button
              className={`view-tab ${activeTab === '2d' ? 'active' : ''}`}
              onClick={() => setActiveTab('2d')}
            >
              🗺️ 2D Plan
            </button>
            <button
              className={`view-tab ${activeTab === '3d' ? 'active' : ''}`}
              onClick={() => setActiveTab('3d')}
              disabled={!layout}
            >
              🧊 3D View
            </button>
            {layout && (
              <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {layout.objects.length} objects · {(layout.pathways || []).length} paths
                {layout.unplaced.length > 0 && ` · ${layout.unplaced.length} unplaced`}
              </span>
            )}
          </div>

          {/* Canvas */}
          <div className="canvas-container">
            {!layout && !isLoading && (
              <div className="empty-state">
                <div className="empty-icon">🌱</div>
                <p>Configure your plot and click <strong>Generate Design</strong> to begin</p>
              </div>
            )}

            {isLoading && (
              <div className="empty-state">
                <div style={{ fontSize: '2.5rem', animation: 'spin 1.5s linear infinite' }}>🌀</div>
                <p style={{ color: 'var(--accent-green)' }}>Gemini is designing your landscape…</p>
              </div>
            )}

            {layout && !isLoading && activeTab === '2d' && (
              <TopViewSvg layout={layout} />
            )}

            {layout && !isLoading && activeTab === '3d' && (
              <ThreeDViewer layout={layout} />
            )}
          </div>

          {/* Unplaced Banner */}
          {layout?.unplaced?.length > 0 && (
            <div className="unplaced-banner">
              ⚠️ Unplaced:&nbsp;
              {layout.unplaced.map((u, i) => (
                <span key={i} style={{ marginRight: 16 }}>
                  <strong>{u.type}</strong> — {u.reason}
                </span>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {layout?.recommendations?.length > 0 && (
            <div className="notes-strip">
              {layout.recommendations.map((note, i) => (
                <div key={i} className="note-item">{note}</div>
              ))}
            </div>
          )}

          {/* Scores */}
          <ScorePanel scores={layout?.scores} />
        </main>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="error-toast" onClick={() => setError(null)}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
