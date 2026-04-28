import { useProject } from '../context/ProjectContext';
import { getDefinition } from '../data/components';
import { ArrowLeft } from 'lucide-react';
import { Icon } from './Icon';
import type { ComponentInstance, Pin } from '../types';

interface Props {
  componentId: string;
  onMobileBack?: () => void;
}

export default function ComponentConfig({ componentId, onMobileBack }: Props) {
  const { project, dispatch } = useProject();
  const inst = project.components.find((c) => c.id === componentId);

  if (!inst) {
    return (
      <div className="component-config empty">
        <div className="config-placeholder">
          <span className="config-placeholder-icon"><Icon name="Settings" size={32} strokeWidth={1.25} /></span>
          <p>Select a component from the list to configure it.</p>
        </div>
      </div>
    );
  }

  const def = getDefinition(inst.type);
  if (!def) return null;

  const boardPins = project.board?.pins || [];

  const updateConfig = (key: string, value: unknown) => {
    dispatch({
      type: 'UPDATE_COMPONENT',
      id: inst.id,
      changes: { config: { ...inst.config, [key]: value } },
    });
  };

  const updatePin = (role: string, gpioNum: number | null) => {
    dispatch({
      type: 'UPDATE_COMPONENT',
      id: inst.id,
      changes: { pins: { ...inst.pins, [role]: gpioNum } },
    });
  };

  // Check which pins are already used by other components
  const usedPins = new Set<number>();
  for (const c of project.components) {
    if (c.id === inst.id) continue;
    for (const v of Object.values(c.pins)) {
      if (v != null) usedPins.add(v);
    }
  }

  const getAvailablePins = (capabilities: string[]): Pin[] => {
    return boardPins.filter((p) => {
      // Pin already used by another component
      if (usedPins.has(p.gpio)) return false;
      // Check capability match
      if (capabilities.length === 0) return true;
      return capabilities.some((cap) => p.capabilities.includes(cap as Pin['capabilities'][number]));
    });
  };

  // Group config fields
  const groups = new Map<string, typeof def.configFields>();
  for (const field of def.configFields) {
    const group = field.group || '';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(field);
  }

  return (
    <div className="component-config">
      {onMobileBack && (
        <button className="mobile-back-btn" onClick={onMobileBack}>
          <ArrowLeft size={14} /> Back to components
        </button>
      )}
      <div className="config-header">
        <span className="config-icon"><Icon name={def.icon} size={20} /></span>
        <div>
          <h3>{def.name}</h3>
          <p className="config-type">{def.type}</p>
        </div>
      </div>

      <form className="config-form" onSubmit={(e) => e.preventDefault()}>
        {/* Pin assignments */}
        {def.pins.length > 0 && (
          <fieldset className="config-fieldset">
            <legend>Pin Assignment</legend>
            {def.pins.map((pinReq) => {
              const available = getAvailablePins(pinReq.capabilities);
              const currentVal = inst.pins[pinReq.role];
              return (
                <div key={pinReq.role} className="form-group">
                  <label>
                    {pinReq.label}
                    {!pinReq.optional && <span className="required">*</span>}
                  </label>
                  <select
                    value={currentVal ?? ''}
                    onChange={(e) =>
                      updatePin(pinReq.role, e.target.value ? Number(e.target.value) : null)
                    }
                  >
                    <option value="">— Select pin —</option>
                    {available.map((p) => (
                      <option key={p.gpio} value={p.gpio}>
                        GPIO{p.gpio} ({p.label})
                        {p.notes ? ` ⚠ ${p.notes}` : ''}
                      </option>
                    ))}
                    {/* Show currently selected pin even if it would be filtered */}
                    {currentVal != null && !available.find((p) => p.gpio === currentVal) && (
                      <option value={currentVal}>
                        GPIO{currentVal} (currently assigned)
                      </option>
                    )}
                  </select>
                </div>
              );
            })}
          </fieldset>
        )}

        {/* I2C notice */}
        {def.needsI2C && project.board?.defaultI2C && (
          <div className="config-notice">
            ℹ️ Uses I²C bus (SDA: GPIO{project.board.defaultI2C.sda}, SCL: GPIO
            {project.board.defaultI2C.scl})
          </div>
        )}

        {/* Config fields grouped */}
        {Array.from(groups.entries()).map(([group, fields]) => (
          <fieldset key={group} className="config-fieldset">
            {group && <legend>{group}</legend>}
            {fields.map((field) => (
              <div key={field.key} className="form-group">
                <label>
                  {field.label}
                  {field.required && <span className="required">*</span>}
                  {field.unit && <span className="unit">({field.unit})</span>}
                </label>
                {renderField(field, inst, updateConfig)}
              </div>
            ))}
          </fieldset>
        ))}
      </form>
    </div>
  );
}

function renderField(
  field: { key: string; type: string; default?: unknown; options?: { label: string; value: string }[]; placeholder?: string },
  inst: ComponentInstance,
  updateConfig: (key: string, value: unknown) => void,
) {
  const value = inst.config[field.key];

  switch (field.type) {
    case 'text':
    case 'password':
      return (
        <input
          type={field.type === 'password' ? 'password' : 'text'}
          value={(value as string) ?? ''}
          placeholder={field.placeholder}
          onChange={(e) => updateConfig(field.key, e.target.value)}
        />
      );
    case 'number':
      return (
        <input
          type="number"
          value={(value as number) ?? ''}
          placeholder={field.placeholder}
          onChange={(e) => updateConfig(field.key, e.target.value ? Number(e.target.value) : '')}
        />
      );
    case 'select':
      return (
        <select
          value={(value as string) ?? ''}
          onChange={(e) => updateConfig(field.key, e.target.value)}
        >
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    case 'boolean':
      return (
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => updateConfig(field.key, e.target.checked)}
          />
          <span className="toggle-text">{value ? 'Enabled' : 'Disabled'}</span>
        </label>
      );
    default:
      return null;
  }
}
