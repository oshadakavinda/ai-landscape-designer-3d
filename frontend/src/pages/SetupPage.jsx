import { useState } from 'react';
import { FEATURES } from '../data/featureCatalog';

const DEFAULT_FORM = {
  land: { width: 20, depth: 30, unit: 'm' },
  house: { x: 5, y: 8, width: 10, depth: 9 },
  car_park: { type: 'open' },
  road_direction: 'south',
  vastu_priority: 5,
  vehicle_count: 1,
  ground_texture: 'grass',
  wall_texture: 'brick',
  optional_features: { bench: 1, trees: 3, bush: 1, pathway: 1 },
};

// Per-feature maximum counts
const FEATURE_MAX = {
  bench: 5,
  pond: 2,
  fountain: 2,
  trees: 6,
  flower_beds: 6,
  vegetable_beds: 3,
  bush: 8,
  pathway: 3,
  well: 2,
};

export default function SetupPage({ onGenerate, onUseExample, isLoading, error, onDismissError }) {
  const [form, setForm] = useState(DEFAULT_FORM);

  const setNested = (parent, key, val) =>
    setForm(f => ({ ...f, [parent]: { ...f[parent], [key]: Number(val) || val } }));

  const setTop = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const updateFeatureCount = (key, count) => {
    setForm(f => {
      const next = { ...f.optional_features };
      if (count <= 0) delete next[key];
      else next[key] = count;
      return { ...f, optional_features: next };
    });
  };

  const toggleFeature = (key) => {
    setForm(f => {
      const next = { ...f.optional_features };
      if (next[key]) delete next[key];
      else next[key] = 1;
      return { ...f, optional_features: next };
    });
  };

  // Derived max limits based on land dimensions
  const maxHouseX = Math.max(0, form.land.width - form.house.width);
  const maxHouseY = Math.max(0, form.land.depth - form.house.depth);
  const maxHouseW = Math.max(3, form.land.width - form.house.x);
  const maxHouseD = Math.max(3, form.land.depth - form.house.y);

  const validationErrors = [];
  if (form.house.x + form.house.width > form.land.width)
    validationErrors.push('House exceeds land width');
  if (form.house.y + form.house.depth > form.land.depth)
    validationErrors.push('House exceeds land depth');
  if (form.house.width < 3 || form.house.depth < 3)
    validationErrors.push('House must be at least 3×3m');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validationErrors.length > 0) return;

    const vCount = form.vehicle_count;
    const carParkData = vCount > 0 ? {
      width: Math.max(3, vCount * 3.0),
      depth: 5.5,
      type: form.car_park.type
    } : null;

    onGenerate({ ...form, car_park: carParkData });
  };

  const vastuPct = (form.vastu_priority / 10) * 100;
  const vastuLabel = form.vastu_priority <= 3 ? 'Low' : form.vastu_priority <= 7 ? 'Medium' : 'High';
  const featureCount = Object.values(form.optional_features).reduce((a, b) => a + b, 0);

  return (
    <div className="setup-page">
      {/* ── Loading Overlay ── */}
      {isLoading && (
        <div className="setup-loading-overlay">
          <div className="setup-loading-inner">
            <div className="setup-loading-spinner" />
            <div className="setup-loading-title">Designing Your Landscape</div>
            <div className="setup-loading-sub">Gemini is crafting a Vastu-aware layout…</div>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <header className="setup-hero">
        <div className="setup-logo">L</div>
        <h1>AI Landscape Designer</h1>
        <p>Configure your plot, house, and desired features — then let Gemini design a Vastu-aware 3D landscape for you.</p>
      </header>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="setup-content">
        {/* Row 1: Land · House · Parking */}
        <div className="setup-grid setup-grid-3">
          {/* Land Dimensions */}
          <div className="setup-card">
            <div className="setup-card-header">
              <div className="setup-card-icon" style={{ background: 'rgba(99,190,123,0.15)', color: 'var(--accent-green)' }}>📐</div>
              <div className="setup-card-title">Land Dimensions</div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Width (m)</label>
                <input type="number" min="20" max="40" value={form.land.width}
                  onChange={e => setNested('land', 'width', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Depth (m)</label>
                <input type="number" min="20" max="40" value={form.land.depth}
                  onChange={e => setNested('land', 'depth', e.target.value)} />
              </div>
            </div>
          </div>

          {/* House Placement */}
          <div className="setup-card">
            <div className="setup-card-header">
              <div className="setup-card-icon" style={{ background: 'rgba(56,189,248,0.15)', color: 'var(--accent-sky)' }}>🏠</div>
              <div className="setup-card-title">House Placement</div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>X Position</label>
                <input type="number" min="0" max={maxHouseX} value={form.house.x}
                  onChange={e => setNested('house', 'x', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Y Position</label>
                <input type="number" min="0" max={maxHouseY} value={form.house.y}
                  onChange={e => setNested('house', 'y', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Width</label>
                <input type="number" min="3" max={maxHouseW} value={form.house.width}
                  onChange={e => setNested('house', 'width', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Depth</label>
                <input type="number" min="3" max={maxHouseD} value={form.house.depth}
                  onChange={e => setNested('house', 'depth', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Car Park */}
          <div className="setup-card">
            <div className="setup-card-header">
              <div className="setup-card-icon" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--accent-amber)' }}>🚗</div>
              <div className="setup-card-title">Parking</div>
            </div>
            <div className="form-group">
              <label>Parking Type</label>
              <select value={form.car_park.type} onChange={e => setNested('car_park', 'type', e.target.value)}>
                <option value="open">Open Parking</option>
                <option value="covered">Covered / Garage</option>
              </select>
            </div>
            <div className="form-group">
              <label>Vehicles</label>
              <select value={form.vehicle_count} onChange={e => setTop('vehicle_count', Number(e.target.value))}>
                {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Site Config · Features */}
        <div className="setup-grid setup-grid-2">
          {/* Site Configuration */}
          <div className="setup-card">
            <div className="setup-card-header">
              <div className="setup-card-icon" style={{ background: 'rgba(168,139,250,0.15)', color: '#a78bfa' }}>⚙️</div>
              <div className="setup-card-title">Site Configuration</div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Road Direction</label>
                <select value={form.road_direction} onChange={e => setTop('road_direction', e.target.value)}>
                  {['north', 'south', 'east', 'west'].map(d => (
                    <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Ground Texture</label>
                <select value={form.ground_texture} onChange={e => setTop('ground_texture', e.target.value)}>
                  {[
                    { value: 'grass', label: 'Grass' },
                    { value: 'stone_paving', label: 'Stone Paving' },
                    { value: 'bare_earth', label: 'Bare Earth' },
                    { value: 'mixed', label: 'Mixed' },
                  ].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Wall Texture</label>
              <select value={form.wall_texture} onChange={e => setTop('wall_texture', e.target.value)}>
                {[
                  { value: 'brick', label: 'Brick' },
                  { value: 'concrete', label: 'Concrete' },
                ].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Vastu Priority — <strong style={{ color: 'var(--accent-green)' }}>{vastuLabel}</strong></label>
              <div className="slider-wrapper">
                <input
                  type="range" min="0" max="10" step="1"
                  value={form.vastu_priority}
                  style={{ '--pct': `${vastuPct}%` }}
                  onChange={e => setTop('vastu_priority', Number(e.target.value))}
                />
                <div className="slider-value">
                  <span>0</span>
                  <span className="current">{form.vastu_priority}/10</span>
                  <span>10</span>
                </div>
              </div>
            </div>
          </div>

          {/* Landscape Features */}
          <div className="setup-card">
            <div className="setup-card-header">
              <div className="setup-card-icon" style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>🌳</div>
              <div className="setup-card-title">Landscape Features</div>
              {featureCount > 0 && (
                <span className="setup-feature-badge">{featureCount} selected</span>
              )}
            </div>
            <div className="feature-list">
              {FEATURES.filter(f => !f.key.includes('car_park')).map(({ key, label }) => {
                const count = form.optional_features[key] || 0;
                const active = count > 0;
                return (
                  <div key={key} className={`feature-item ${active ? 'active' : ''}`}>
                    <label className="feature-toggle">
                      <input type="checkbox" checked={active} onChange={() => toggleFeature(key)} />
                      <span className="check-box" />
                      <span className="feature-label">{label}</span>
                    </label>
                    {active && (
                      <>
                        <input
                          type="number"
                          className="feature-count-input"
                          min="1" max={FEATURE_MAX[key] || 5}
                          value={count}
                          onChange={e => updateFeatureCount(key, Math.min(Number(e.target.value), FEATURE_MAX[key] || 5))}
                        />
                        <span className="feature-max-hint">max {FEATURE_MAX[key] || 5}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Validation Errors ── */}
        {validationErrors.length > 0 && (
          <div className="setup-validation-errors">
            {validationErrors.map((err, i) => (
              <div key={i} className="validation-error">⚠️ {err}</div>
            ))}
          </div>
        )}

        {/* ── Actions ── */}
        <div className="setup-actions">
          <button type="submit" className="btn-generate setup-generate-btn" disabled={isLoading || validationErrors.length > 0}>
            {isLoading ? <><span className="spinner" />Generating...</> : '🚀  Generate Design'}
          </button>
          <button type="button" className="setup-example-link" onClick={onUseExample}>
            or try with an <strong>example layout</strong>
          </button>
        </div>
      </form>

      {/* ── Error Toast ── */}
      {error && (
        <div className="error-toast" onClick={onDismissError}>
          {error}
        </div>
      )}
    </div>
  );
}
