import { MODEL_PATHS, OBJECT_DIMENSIONS } from '../../data/featureCatalog';
import { SURFACE_TEXTURES } from '../../constants/texturePaths';
import { MATERIAL_COLORS } from '../../constants/renderConfig';

export default function ObjectInspector({ selectedObject, onUpdate, onClose }) {
  if (!selectedObject) return null;

  const isModel = selectedObject.render_type === 'model';
  const isFlat = selectedObject.render_type === 'flat';

  // Find valid variants for this object type
  const availableVariants = Object.keys(MODEL_PATHS).filter(v => 
    v.startsWith(selectedObject.type.split('_')[0]) || 
    v.includes(selectedObject.type)
  );

  // Surface materials
  const availableMaterials = Object.keys(SURFACE_TEXTURES).length > 0 
    ? Object.keys(SURFACE_TEXTURES) 
    : Object.keys(MATERIAL_COLORS);

  return (
    <div className="sidebar-section object-inspector">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div className="section-label" style={{ margin: 0 }}>Object Inspector</div>
        <button 
          onClick={onClose}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-muted)', 
            cursor: 'pointer',
            fontSize: '1.2rem'
          }}
        >
          ✕
        </button>
      </div>

      <div className="object-details" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Type:</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', textTransform: 'capitalize' }}>
            {selectedObject.type.replace(/_/g, ' ')}
          </span>
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
          <label>Model Variant</label>
          <select 
            value={selectedObject.variant} 
            onChange={(e) => onUpdate({ variant: e.target.value })}
          >
            {availableVariants.map(v => (
              <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      )}

      {isFlat && (
        <div className="form-group">
          <label>Surface Material</label>
          <select 
            value={selectedObject.material || ''} 
            onChange={(e) => onUpdate({ material: e.target.value })}
          >
            <option value="">Default</option>
            {availableMaterials.map(m => (
              <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
            ))}
          </select>
        </div>
      )}

      <div style={{ marginTop: '12px', fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
        Click another object to inspect, or click the ground to deselect.
      </div>
    </div>
  );
}
