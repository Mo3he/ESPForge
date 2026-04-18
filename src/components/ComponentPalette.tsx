import { useState } from 'react';
import { componentDefinitions, getCategories } from '../data/components';
import { useProject, generateId } from '../context/ProjectContext';
import type { ComponentDefinition, ComponentInstance } from '../types';

interface Props {
  onSelectComponent: (id: string) => void;
  selectedComponentId: string | null;
}

export default function ComponentPalette({ onSelectComponent, selectedComponentId }: Props) {
  const { project, dispatch } = useProject();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(getCategories().map((c) => c.key)),
  );
  const [search, setSearch] = useState('');

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleAdd = (def: ComponentDefinition) => {
    const id = generateId(def.domain);
    const pins: Record<string, null> = {};
    for (const p of def.pins) {
      pins[p.role] = null;
    }

    const config: Record<string, unknown> = {};
    for (const f of def.configFields) {
      if (f.default !== undefined) config[f.key] = f.default;
    }

    const instance: ComponentInstance = {
      id,
      type: def.type,
      name: def.name,
      config,
      pins,
    };

    dispatch({ type: 'ADD_COMPONENT', component: instance });
    onSelectComponent(id);
  };

  const handleRemove = (id: string) => {
    dispatch({ type: 'REMOVE_COMPONENT', id });
    if (selectedComponentId === id) onSelectComponent('');
  };

  const handleMove = (id: string, direction: 'up' | 'down') => {
    dispatch({ type: 'MOVE_COMPONENT', id, direction });
  };

  const categories = getCategories();

  // Filter definitions by board platform and BLE capability
  const platform = project.board?.platform;
  const boardHasBLE = project.board?.hasBLE;
  const availableDefinitions = componentDefinitions.filter((def) => {
    // Filter by platform
    if (def.platformFilter && platform) {
      if (!def.platformFilter.includes(platform as 'esp32' | 'esp8266')) return false;
    }
    // Filter platform-specific outputs
    if (def.type === 'output.ledc' && platform === 'esp8266') return false;
    if (def.type === 'output.esp8266_pwm' && platform === 'esp32') return false;
    // Filter BLE-requiring components
    if (def.requiresBLE && !boardHasBLE) return false;
    return true;
  });

  return (
    <div className="component-palette">
      {/* Added components */}
      <div className="palette-section">
        <h3 className="palette-section-title">Added Components ({project.components.length})</h3>
        {project.components.length === 0 && (
          <p className="palette-empty">No components added yet. Pick from the palette below.</p>
        )}
        <div className="added-components-list">
          {project.components.map((inst, idx) => {
            const def = componentDefinitions.find((d) => d.type === inst.type);
            const pinLabels = Object.entries(inst.pins)
              .filter(([, v]) => v != null)
              .map(([, v]) => `GPIO${v}`)
              .join(', ');
            return (
              <div
                key={inst.id}
                className={`added-component-item ${selectedComponentId === inst.id ? 'selected' : ''}`}
                onClick={() => onSelectComponent(inst.id)}
              >
                <span className="added-component-icon">{def?.icon || '📦'}</span>
                <div className="added-component-info">
                  <span className="added-component-name">
                    {(inst.config.name as string) || inst.name}
                  </span>
                  {pinLabels && <span className="added-component-pins">{pinLabels}</span>}
                </div>
                <div className="component-item-actions">
                  <button
                    className="btn-icon btn-move"
                    onClick={(e) => { e.stopPropagation(); handleMove(inst.id, 'up'); }}
                    disabled={idx === 0}
                    title="Move up"
                  >▲</button>
                  <button
                    className="btn-icon btn-move"
                    onClick={(e) => { e.stopPropagation(); handleMove(inst.id, 'down'); }}
                    disabled={idx === project.components.length - 1}
                    title="Move down"
                  >▼</button>
                  <button
                    className="btn-icon btn-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(inst.id);
                    }}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Palette */}
      <div className="palette-section">
        <h3 className="palette-section-title">Component Palette</h3>
        <input
          className="search-input search-input-sm"
          type="text"
          placeholder="Search components..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {categories.map((cat) => {
          const query = search.toLowerCase();
          const items = availableDefinitions.filter((d) => {
            if (d.category !== cat.key) return false;
            if (!query) return true;
            return (
              d.name.toLowerCase().includes(query) ||
              d.description.toLowerCase().includes(query) ||
              d.type.toLowerCase().includes(query)
            );
          });
          if (items.length === 0) return null;
          const isExpanded = expandedCategories.has(cat.key) || !!search;

          return (
            <div key={cat.key} className="palette-category">
              <button className="palette-category-header" onClick={() => toggleCategory(cat.key)}>
                <span>
                  {cat.icon} {cat.label}
                </span>
                <span className="palette-chevron">{isExpanded ? '▾' : '▸'}</span>
              </button>
              {isExpanded && (
                <div className="palette-category-items">
                  {items.map((def) => (
                    <div key={def.type} className="palette-item">
                      <div className="palette-item-info">
                        <span className="palette-item-name">{def.name}</span>
                        <span className="palette-item-desc">{def.description}</span>
                      </div>
                      <button className="btn btn-sm btn-add" onClick={() => handleAdd(def)}>
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
