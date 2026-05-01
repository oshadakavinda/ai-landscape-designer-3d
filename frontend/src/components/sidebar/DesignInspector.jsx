import { SURFACE_TEXTURES } from '../../constants/texturePaths';
import { MATERIAL_COLORS } from '../../constants/renderConfig';
import { MODEL_PATHS } from '../../data/featureCatalog';

export default function DesignInspector({ layout, onUpdateLayout, selectedObject, onUpdateObject, onStartOver }) {
  const availableMaterials = Object.keys(SURFACE_TEXTURES).length > 0 
    ? Object.keys(SURFACE_TEXTURES) 
    : Object.keys(MATERIAL_COLORS);

  const handleGroundTextureChange = (tex) => {
    onUpdateLayout({
      land: { ...layout.land, ground_texture: tex }
    });
  };

  const handleWallTextureChange = (tex) => {
    onUpdateLayout({
      land: { ...layout.land, wall_texture: tex }
    });
  };

  // Object specific logic
  const getAvailableVariants = (obj) => {
    if (!obj) return [];
    const typeBase = obj.type.toLowerCase().replace(/s$/, ''); // singular
    return Object.keys(MODEL_PATHS).filter(v => 
      v.toLowerCase().includes(typeBase) || 
      v.toLowerCase().startsWith(obj.type.split('_')[0])
    );
  };

  const availableVariants = getAvailableVariants(selectedObject);
  const isModel = selectedObject?.render_type === 'model';
  const isFlat = selectedObject?.render_type === 'flat';

  return (
    <div className="design-inspector">
      <div className="sidebar-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div className="section-label" style={{ margin: 0 }}>Design Settings</div>
          <button className="btn-small" onClick={onStartOver} style={{ fontSize: '0.65rem', padding: '4px 8px' }}>
            Start Over
          </button>
        </div>
        
        <div className="form-group">
          <label>Ground Texture</label>
          <select 
            value={layout.land.ground_texture || 'grass'} 
            onChange={(e) => handleGroundTextureChange(e.target.value)}
          >
            <option value="grass">Grass</option>
            <option value="stone_paving">Stone Paving</option>
            <option value="bare_earth">Bare Earth</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>

        <div className="form-group">
          <label>Wall Texture</label>
          <select 
            value={layout.land.wall_texture || 'brick'} 
            onChange={(e) => handleWallTextureChange(e.target.value)}
          >
            <option value="brick">Brick</option>
            <option value="concrete">Concrete</option>
          </select>
        </div>
      </div>

      {selectedObject ? (
        <div className="sidebar-section active-selection">
          <div className="section-label" style={{ color: 'var(--accent-sky)' }}>Selected: {selectedObject.type.replace(/_/g, ' ')}</div>
          
          <div className="object-details" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>ID:</span>
              <span style={{ color: 'var(--text-primary)' }}>{selectedObject.id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Size:</span>
              <span style={{ color: 'var(--text-primary)' }}>
                {selectedObject.width}m x {selectedObject.depth}m
              </span>
            </div>
          </div>

          {isModel && availableVariants.length > 1 && (
            <div className="form-group">
              <label>Model Style / Variant</label>
              <select 
                value={selectedObject.variant} 
                onChange={(e) => onUpdateObject({ variant: e.target.value })}
                style={{ borderColor: 'var(--accent-sky)' }}
              >
                {availableVariants.map(v => (
                  <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          )}

          {isFlat && (
            <div className="form-group">
              <label>Material / Pattern</label>
              <select 
                value={selectedObject.material || ''} 
                onChange={(e) => onUpdateObject({ material: e.target.value })}
                style={{ borderColor: 'var(--accent-sky)' }}
              >
                <option value="">Default</option>
                {availableMaterials.map(m => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
            </div>
          )}
          
          <div style={{ marginTop: '8px', fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Click the ground to deselect.
          </div>
        </div>
      ) : (
        <div className="sidebar-section hint-box">
          <div className="section-label" style={{ opacity: 0.5 }}>Objects in Design</div>
          <div className="object-mini-list" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {layout.objects.slice(0, 10).map(obj => (
              <div 
                key={obj.id} 
                className="mini-obj-item"
                style={{ 
                  fontSize: '0.7rem', 
                  padding: '6px 8px', 
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}
                onClick={() => onSelect(obj.id)}
              >
                <span style={{ textTransform: 'capitalize' }}>{obj.type.replace(/_/g, ' ')}</span>
                <span style={{ color: 'var(--text-muted)' }}>{obj.variant.split('_')[0]}</span>
              </div>
            ))}
            {layout.objects.length > 10 && <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center' }}>+ {layout.objects.length - 10} more</div>}
          </div>
        </div>
      )}
    </div>
  );
}
