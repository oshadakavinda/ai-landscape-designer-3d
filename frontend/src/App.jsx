import { useState } from 'react';
import LayoutForm from './components/sidebar/LayoutForm';
import ObjectInspector from './components/sidebar/ObjectInspector';
import TopViewSvg from './components/viewer2d/TopViewSvg';
import ThreeDViewer from './components/viewer3d/index';
import ScorePanel from './components/ScorePanel';
import ChatPrompt from './components/ChatPrompt';
import { generateLandscapeDesign, modifyLandscapeDesign } from './api/landscapeApi';
import exampleLayout from './data/exampleLayout.json';

export default function App() {
  const [layout, setLayout] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('2d');
  const [error, setError] = useState(null);
  // Track whether 3D has ever been opened — so we lazy-mount once and keep alive
  const [has3dMounted, setHas3dMounted] = useState(false);
  const [lastFormData, setLastFormData] = useState(null);

  const handleUseExample = () => {
    setLayout(exampleLayout);
    setActiveTab('2d');
    setError(null);
  };

  const handleGenerate = async (formData) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateLandscapeDesign(formData);
      setLayout(result);
      setLastFormData(formData);
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

  const handleModify = async (prompt) => {
    if (!layout || !lastFormData) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await modifyLandscapeDesign(layout, prompt, lastFormData);
      setLayout(result);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to modify the design. Is the server running?'
      );
      throw err; // re-throw so ChatPrompt can show error status
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-shell">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="logo-icon">🌿</div>
        <div className="header-titles">
          <h1>AI Landscape Designer</h1>
          <span className="subtitle">Powered by Gemini · Vastu-aware · 3D Interactive</span>
        </div>
        <button className="btn-example" onClick={handleUseExample}>
          ✨ Use Example
        </button>
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
              onClick={() => {
                setActiveTab('3d');
                // Lazy-mount: only mount ThreeDViewer the first time
                if (!has3dMounted) setHas3dMounted(true);
              }}
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

            {/* 2D viewer — always shown when layout is ready and 2D is active */}
            {layout && !isLoading && activeTab === '2d' && (
              <TopViewSvg layout={layout} />
            )}

            {/*
              3D viewer — lazy-mounted on first 3D tab click, then kept alive.
              Uses visibility:hidden (NOT display:none) so the WebGL Canvas always
              has real pixel dimensions and renders correctly even when "hidden".
            */}
            {layout && !isLoading && has3dMounted && (
              <div style={{
                position: 'absolute',
                inset: 0,
                visibility: activeTab === '3d' ? 'visible' : 'hidden',
                pointerEvents: activeTab === '3d' ? 'auto' : 'none',
              }}>
                <ThreeDViewer layout={layout} />
              </div>
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

          {/* Chat Prompt */}
          <ChatPrompt onModify={handleModify} isLoading={isLoading} hasLayout={!!layout} />

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
