import { useState, useEffect } from 'react';
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
  // Walk mode state
  const [walkMode, setWalkMode] = useState(false);
  const [showWalkHud, setShowWalkHud] = useState(false);
  // True once the browser grants pointer lock on the canvas
  const [isPointerLocked, setIsPointerLocked] = useState(false);

  const handleUseExample = () => {
    setLayout(exampleLayout);
    setActiveTab('2d');
    setError(null);
    setWalkMode(false);
  };

  // Track pointer lock changes globally
  useEffect(() => {
    const onChange = () => {
      const locked = !!document.pointerLockElement;
      setIsPointerLocked(locked);
      // If the user pressed Esc to release the lock, exit walk mode too
      if (!locked && walkMode) {
        setWalkMode(false);
        setActiveTab('3d');
      }
    };
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walkMode]);

  // Show HUD for 4 s when entering walk mode (after lock is acquired)
  useEffect(() => {
    if (!isPointerLocked) { setShowWalkHud(false); return; }
    setShowWalkHud(true);
    const t = setTimeout(() => setShowWalkHud(false), 4000);
    return () => clearTimeout(t);
  }, [isPointerLocked]);

  const handleGenerate = async (formData) => {
    setIsLoading(true);
    setError(null);
    setWalkMode(false);
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

  const handleEnterWalk = () => {
    if (!has3dMounted) setHas3dMounted(true);
    setActiveTab('walk');
    setWalkMode(true);
  };

  const handleExitWalk = () => {
    // Release pointer lock first so cursor reappears immediately
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    setWalkMode(false);
    setIsPointerLocked(false);
    setActiveTab('3d');
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
              onClick={() => { setActiveTab('2d'); setWalkMode(false); }}
            >
              🗺️ 2D Plan
            </button>
            <button
              className={`view-tab ${activeTab === '3d' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('3d');
                setWalkMode(false);
                if (!has3dMounted) setHas3dMounted(true);
              }}
              disabled={!layout}
            >
              🧊 3D View
            </button>
            <button
              className={`view-tab walk-tab ${activeTab === 'walk' ? 'active' : ''}`}
              onClick={handleEnterWalk}
              disabled={!layout}
              title="First-person walk mode — WASD to move, drag to look"
            >
              🚶 Walk
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
                visibility: (activeTab === '3d' || activeTab === 'walk') ? 'visible' : 'hidden',
                pointerEvents: (activeTab === '3d' || activeTab === 'walk') ? 'auto' : 'none',
              }}>
                <ThreeDViewer layout={layout} walkMode={walkMode} />

                {/* ── Walk Mode HUD ── */}
                {walkMode && (
                  <>
                    {/* "Click to capture" overlay — shown until pointer lock is active.
                        The overlay sits ABOVE the canvas so we must call requestPointerLock
                        from here directly — clicking the overlay never reaches the canvas. */}
                    {!isPointerLocked && (
                      <div
                        className="walk-capture-overlay"
                        onClick={() => {
                          const canvas = document.querySelector('canvas');
                          if (canvas) canvas.requestPointerLock();
                        }}
                      >
                        <div className="walk-capture-inner">
                          <div className="walk-capture-icon">🖱️</div>
                          <div className="walk-capture-title">Click to enter walk mode</div>
                          <div className="walk-capture-sub">Move mouse to look · WASD to walk · Esc to exit</div>
                        </div>
                      </div>
                    )}

                    {/* Key-hint HUD — fades in after lock acquired, disappears after 4 s */}
                    <div className={`walk-hud ${showWalkHud ? 'walk-hud-visible' : ''}`}>
                      <div className="walk-hud-inner">
                        <div className="walk-hud-title">🚶 Walk Mode</div>
                        <div className="walk-hud-keys">
                          <span className="walk-key">W A S D</span> Move
                          &nbsp;·&nbsp;
                          <span className="walk-key">Mouse</span> Look
                          &nbsp;·&nbsp;
                          <span className="walk-key">Shift</span> Sprint
                          &nbsp;·&nbsp;
                          <span className="walk-key">Esc</span> Exit
                        </div>
                      </div>
                    </div>

                    {/* Exit Walk button — only visible when locked (not obscured by capture overlay) */}
                    {isPointerLocked && (
                      <button className="exit-walk-btn" onClick={handleExitWalk}>
                        ✕ Exit Walk
                      </button>
                    )}
                  </>
                )}
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
