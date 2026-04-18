import { useState } from 'react';
import { useProject, generateId } from '../context/ProjectContext';
import type { Automation, AutomationAction, AutomationCondition, AutomationTrigger } from '../types';

export default function AutomationBuilder() {
  const { project, dispatch } = useProject();
  const [editingId, setEditingId] = useState<string | null>(null);

  const binarySensors = project.components.filter((c) => c.type.startsWith('binary_sensor.'));
  const sensors = project.components.filter((c) => c.type.startsWith('sensor.'));
  const switches = project.components.filter((c) => c.type.startsWith('switch.'));
  const lights = project.components.filter((c) => c.type.startsWith('light.'));
  const fans = project.components.filter((c) => c.type.startsWith('fan.'));
  const covers = project.components.filter((c) => c.type.startsWith('cover.'));
  const locks = project.components.filter((c) => c.type.startsWith('lock.'));
  const numbers = project.components.filter((c) => c.type.startsWith('number.'));

  const handleAdd = () => {
    const auto: Automation = {
      id: generateId('auto'),
      name: 'New Automation',
      trigger: { type: 'on_boot', config: {} },
      conditions: [],
      actions: [],
    };
    dispatch({ type: 'ADD_AUTOMATION', automation: auto });
    setEditingId(auto.id);
  };

  const handleRemove = (id: string) => {
    dispatch({ type: 'REMOVE_AUTOMATION', id });
    if (editingId === id) setEditingId(null);
  };

  const handleUpdate = (auto: Automation) => {
    dispatch({ type: 'UPDATE_AUTOMATION', id: auto.id, automation: auto });
  };

  return (
    <div className="automation-builder">
      <div className="automation-header">
        <h2>Automations</h2>
        <button className="btn btn-primary" onClick={handleAdd}>
          + Add Automation
        </button>
      </div>

      {project.automations.length === 0 && (
        <div className="automation-empty">
          <p>No automations yet. Create one to add on-device logic.</p>
          <p className="text-muted">
            Automations let your ESP react to events — button presses, sensor
            thresholds, timers — and perform actions like toggling switches,
            controlling fans, opening covers, or publishing MQTT messages.
          </p>
        </div>
      )}

      <div className="automation-list">
        {project.automations.map((auto) => (
          <div
            key={auto.id}
            className={`automation-card ${editingId === auto.id ? 'expanded' : ''}`}
          >
            <div
              className="automation-card-header"
              onClick={() => setEditingId(editingId === auto.id ? null : auto.id)}
            >
              <span className="automation-card-name">⚡ {auto.name}</span>
              <div className="automation-card-summary">
                <span className="badge">{triggerLabel(auto.trigger)}</span>
                {auto.conditions.length > 0 && <span className="badge">{auto.conditions.length} condition(s)</span>}
                <span className="badge">{auto.actions.length} action(s)</span>
              </div>
              <button
                className="btn-icon btn-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(auto.id);
                }}
                title="Remove"
              >
                ×
              </button>
            </div>

            {editingId === auto.id && (
              <AutomationEditor
                automation={auto}
                onUpdate={handleUpdate}
                binarySensors={binarySensors}
                sensors={sensors}
                switches={switches}
                lights={lights}
                fans={fans}
                covers={covers}
                locks={locks}
                numbers={numbers}
                mqttEnabled={project.settings.mqttEnabled}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Inline editor ──

type CompRef = { id: string; config: Record<string, unknown>; name: string; type: string };

interface EditorProps {
  automation: Automation;
  onUpdate: (auto: Automation) => void;
  binarySensors: CompRef[];
  sensors: CompRef[];
  switches: CompRef[];
  lights: CompRef[];
  fans: CompRef[];
  covers: CompRef[];
  locks: CompRef[];
  numbers: CompRef[];
  mqttEnabled: boolean;
}

function AutomationEditor({
  automation, onUpdate,
  binarySensors, sensors, switches, lights, fans, covers, locks, numbers,
  mqttEnabled,
}: EditorProps) {
  const update = (patch: Partial<Automation>) => {
    onUpdate({ ...automation, ...patch });
  };

  const updateTrigger = (patch: Partial<AutomationTrigger>) => {
    update({ trigger: { ...automation.trigger, ...patch } });
  };

  const addAction = () => {
    const action: AutomationAction = {
      id: generateId('act'),
      type: 'logger.log',
      config: { message: 'Automation fired' },
    };
    update({ actions: [...automation.actions, action] });
  };

  const updateAction = (idx: number, patch: Partial<AutomationAction>) => {
    const actions = [...automation.actions];
    actions[idx] = { ...actions[idx], ...patch };
    update({ actions });
  };

  const removeAction = (idx: number) => {
    update({ actions: automation.actions.filter((_, i) => i !== idx) });
  };

  const addCondition = () => {
    const cond: AutomationCondition = {
      id: generateId('cond'),
      type: 'sensor_in_range',
      config: {},
    };
    update({ conditions: [...automation.conditions, cond] });
  };

  const updateCondition = (idx: number, patch: Partial<AutomationCondition>) => {
    const conditions = [...automation.conditions];
    conditions[idx] = { ...conditions[idx], ...patch };
    update({ conditions });
  };

  const removeCondition = (idx: number) => {
    update({ conditions: automation.conditions.filter((_, i) => i !== idx) });
  };

  // Helper to get target options for an action type
  const getTargets = (actionType: string): CompRef[] => {
    if (actionType.startsWith('switch.')) return switches;
    if (actionType.startsWith('light.')) return lights;
    if (actionType.startsWith('fan.')) return fans;
    if (actionType.startsWith('cover.')) return covers;
    if (actionType.startsWith('lock.')) return locks;
    if (actionType.startsWith('number.')) return numbers;
    return [];
  };

  const needsTarget = (t: string) =>
    t.startsWith('switch.') || t.startsWith('light.') || t.startsWith('fan.') ||
    t.startsWith('cover.') || t.startsWith('lock.') || t.startsWith('number.');

  return (
    <div className="automation-editor">
      {/* Name */}
      <div className="form-group">
        <label>Automation Name</label>
        <input
          type="text"
          value={automation.name}
          onChange={(e) => update({ name: e.target.value })}
        />
      </div>

      {/* Trigger */}
      <fieldset className="config-fieldset">
        <legend>Trigger</legend>
        <div className="form-group">
          <label>Type</label>
          <select
            value={automation.trigger.type}
            onChange={(e) =>
              updateTrigger({ type: e.target.value as AutomationTrigger['type'], config: {}, componentId: undefined, event: undefined })
            }
          >
            <option value="on_boot">On Boot</option>
            <option value="time_interval">Time Interval</option>
            {binarySensors.length > 0 && <option value="component_state">Component State (Binary)</option>}
            {sensors.length > 0 && <option value="value_range">Sensor Value Threshold</option>}
            {mqttEnabled && <option value="mqtt_message">MQTT Message</option>}
          </select>
        </div>

        {automation.trigger.type === 'time_interval' && (
          <div className="form-group">
            <label>Interval</label>
            <input
              type="text"
              value={(automation.trigger.config.interval as string) || ''}
              placeholder="60s"
              onChange={(e) => updateTrigger({ config: { ...automation.trigger.config, interval: e.target.value } })}
            />
          </div>
        )}

        {automation.trigger.type === 'component_state' && (
          <>
            <div className="form-group">
              <label>Component</label>
              <select
                value={automation.trigger.componentId || ''}
                onChange={(e) => updateTrigger({ componentId: e.target.value })}
              >
                <option value="">— Select —</option>
                {binarySensors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {(c.config.name as string) || c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Event</label>
              <select
                value={automation.trigger.event || 'on_press'}
                onChange={(e) => updateTrigger({ event: e.target.value })}
              >
                <option value="on_press">On Press</option>
                <option value="on_release">On Release</option>
                <option value="on_state">On State Change</option>
                <option value="on_click">On Click</option>
                <option value="on_double_click">On Double Click</option>
              </select>
            </div>
          </>
        )}

        {automation.trigger.type === 'value_range' && (
          <>
            <div className="form-group">
              <label>Sensor</label>
              <select
                value={automation.trigger.componentId || ''}
                onChange={(e) => updateTrigger({ componentId: e.target.value })}
              >
                <option value="">— Select —</option>
                {sensors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {(c.config.name as string) || c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Condition</label>
              <select
                value={(automation.trigger.config.direction as string) || 'above'}
                onChange={(e) => updateTrigger({ config: { ...automation.trigger.config, direction: e.target.value } })}
              >
                <option value="above">Above threshold</option>
                <option value="below">Below threshold</option>
                <option value="between">Between range</option>
              </select>
            </div>
            <div className="form-group">
              <label>{automation.trigger.config.direction === 'between' ? 'Min Value' : 'Threshold'}</label>
              <input
                type="number"
                value={(automation.trigger.config.threshold as number) ?? ''}
                placeholder="e.g. 30"
                onChange={(e) => updateTrigger({ config: { ...automation.trigger.config, threshold: e.target.value ? Number(e.target.value) : '' } })}
              />
            </div>
            {automation.trigger.config.direction === 'between' && (
              <div className="form-group">
                <label>Max Value</label>
                <input
                  type="number"
                  value={(automation.trigger.config.threshold_upper as number) ?? ''}
                  placeholder="e.g. 50"
                  onChange={(e) => updateTrigger({ config: { ...automation.trigger.config, threshold_upper: e.target.value ? Number(e.target.value) : '' } })}
                />
              </div>
            )}
          </>
        )}

        {automation.trigger.type === 'mqtt_message' && (
          <div className="form-group">
            <label>Topic</label>
            <input
              type="text"
              value={(automation.trigger.config.topic as string) || ''}
              placeholder="home/esp/command"
              onChange={(e) => updateTrigger({ config: { ...automation.trigger.config, topic: e.target.value } })}
            />
          </div>
        )}
      </fieldset>

      {/* Conditions */}
      <fieldset className="config-fieldset">
        <legend>
          Conditions <span className="text-muted" style={{ fontWeight: 'normal', fontSize: '0.85em' }}>(optional)</span>
          <button className="btn btn-sm btn-add" onClick={addCondition} style={{ marginLeft: 12 }}>
            + Add
          </button>
        </legend>

        {automation.conditions.length === 0 && (
          <p className="text-muted">No conditions — actions will always run when triggered.</p>
        )}

        {automation.conditions.map((cond, idx) => (
          <div key={cond.id} className="action-row">
            <span className="action-number">if</span>
            <div className="action-fields">
              <select
                value={cond.type}
                onChange={(e) => updateCondition(idx, { type: e.target.value as AutomationCondition['type'], config: {} })}
              >
                <option value="sensor_in_range">Sensor in range</option>
                <option value="state_is">Binary sensor state</option>
                <option value="lambda">Custom lambda</option>
              </select>

              {cond.type === 'sensor_in_range' && (
                <>
                  <select
                    value={(cond.config.sensorId as string) || ''}
                    onChange={(e) => updateCondition(idx, { config: { ...cond.config, sensorId: e.target.value } })}
                  >
                    <option value="">— Sensor —</option>
                    {sensors.map((c) => (
                      <option key={c.id} value={c.id}>{(c.config.name as string) || c.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={(cond.config.above as number) ?? ''}
                    placeholder="Above"
                    style={{ width: 80 }}
                    onChange={(e) => updateCondition(idx, { config: { ...cond.config, above: e.target.value ? Number(e.target.value) : '' } })}
                  />
                  <input
                    type="number"
                    value={(cond.config.below as number) ?? ''}
                    placeholder="Below"
                    style={{ width: 80 }}
                    onChange={(e) => updateCondition(idx, { config: { ...cond.config, below: e.target.value ? Number(e.target.value) : '' } })}
                  />
                </>
              )}

              {cond.type === 'state_is' && (
                <>
                  <select
                    value={(cond.config.sensorId as string) || ''}
                    onChange={(e) => updateCondition(idx, { config: { ...cond.config, sensorId: e.target.value } })}
                  >
                    <option value="">— Binary Sensor —</option>
                    {binarySensors.map((c) => (
                      <option key={c.id} value={c.id}>{(c.config.name as string) || c.name}</option>
                    ))}
                  </select>
                  <select
                    value={(cond.config.state as string) || 'ON'}
                    onChange={(e) => updateCondition(idx, { config: { ...cond.config, state: e.target.value } })}
                  >
                    <option value="ON">is ON</option>
                    <option value="OFF">is OFF</option>
                  </select>
                </>
              )}

              {cond.type === 'lambda' && (
                <input
                  type="text"
                  value={(cond.config.expression as string) || ''}
                  placeholder="return id(sensor).state > 25;"
                  onChange={(e) => updateCondition(idx, { config: { expression: e.target.value } })}
                />
              )}
            </div>
            <button className="btn-icon btn-remove" onClick={() => removeCondition(idx)} title="Remove">
              ×
            </button>
          </div>
        ))}
      </fieldset>

      {/* Actions */}
      <fieldset className="config-fieldset">
        <legend>
          Actions
          <button className="btn btn-sm btn-add" onClick={addAction} style={{ marginLeft: 12 }}>
            + Add
          </button>
        </legend>

        {automation.actions.length === 0 && (
          <p className="text-muted">No actions. Add one above.</p>
        )}

        {automation.actions.map((action, idx) => (
          <div key={action.id} className="action-row">
            <span className="action-number">{idx + 1}</span>
            <div className="action-fields">
              <select
                value={action.type}
                onChange={(e) =>
                  updateAction(idx, { type: e.target.value as AutomationAction['type'], config: {} })
                }
              >
                <optgroup label="Switches">
                  <option value="switch.toggle">Switch Toggle</option>
                  <option value="switch.turn_on">Switch Turn On</option>
                  <option value="switch.turn_off">Switch Turn Off</option>
                </optgroup>
                <optgroup label="Lights">
                  <option value="light.toggle">Light Toggle</option>
                  <option value="light.turn_on">Light Turn On</option>
                  <option value="light.turn_off">Light Turn Off</option>
                </optgroup>
                {fans.length > 0 && (
                  <optgroup label="Fans">
                    <option value="fan.toggle">Fan Toggle</option>
                    <option value="fan.turn_on">Fan Turn On</option>
                    <option value="fan.turn_off">Fan Turn Off</option>
                  </optgroup>
                )}
                {covers.length > 0 && (
                  <optgroup label="Covers">
                    <option value="cover.open">Cover Open</option>
                    <option value="cover.close">Cover Close</option>
                    <option value="cover.stop">Cover Stop</option>
                  </optgroup>
                )}
                {locks.length > 0 && (
                  <optgroup label="Locks">
                    <option value="lock.lock">Lock</option>
                    <option value="lock.unlock">Unlock</option>
                  </optgroup>
                )}
                {numbers.length > 0 && (
                  <optgroup label="Numbers">
                    <option value="number.set">Set Number</option>
                  </optgroup>
                )}
                <optgroup label="Utility">
                  <option value="delay">Delay</option>
                  <option value="logger.log">Log Message</option>
                  {mqttEnabled && <option value="mqtt.publish">MQTT Publish</option>}
                </optgroup>
              </select>

              {/* Target selector for component actions */}
              {needsTarget(action.type) && (
                <select
                  value={(action.config.targetId as string) || ''}
                  onChange={(e) => updateAction(idx, { config: { ...action.config, targetId: e.target.value } })}
                >
                  <option value="">— Select target —</option>
                  {getTargets(action.type).map((c) => (
                    <option key={c.id} value={c.id}>
                      {(c.config.name as string) || c.name}
                    </option>
                  ))}
                </select>
              )}

              {action.type === 'delay' && (
                <input
                  type="text"
                  value={(action.config.delay as string) || ''}
                  placeholder="1s"
                  onChange={(e) => updateAction(idx, { config: { delay: e.target.value } })}
                />
              )}

              {action.type === 'logger.log' && (
                <input
                  type="text"
                  value={(action.config.message as string) || ''}
                  placeholder="Message..."
                  onChange={(e) => updateAction(idx, { config: { message: e.target.value } })}
                />
              )}

              {action.type === 'mqtt.publish' && (
                <div className="action-mqtt-fields">
                  <input
                    type="text"
                    value={(action.config.topic as string) || ''}
                    placeholder="Topic"
                    onChange={(e) => updateAction(idx, { config: { ...action.config, topic: e.target.value } })}
                  />
                  <input
                    type="text"
                    value={(action.config.payload as string) || ''}
                    placeholder="Payload"
                    onChange={(e) => updateAction(idx, { config: { ...action.config, payload: e.target.value } })}
                  />
                </div>
              )}

              {action.type === 'light.turn_on' && (
                <div className="form-group-inline">
                  <label>Brightness %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={(action.config.brightness as number) || ''}
                    placeholder="100"
                    onChange={(e) =>
                      updateAction(idx, {
                        config: { ...action.config, brightness: e.target.value ? Number(e.target.value) : '' },
                      })
                    }
                  />
                </div>
              )}

              {action.type === 'number.set' && (
                <div className="form-group-inline">
                  <label>Value</label>
                  <input
                    type="number"
                    value={(action.config.value as number) ?? ''}
                    placeholder="0"
                    onChange={(e) =>
                      updateAction(idx, {
                        config: { ...action.config, value: e.target.value ? Number(e.target.value) : '' },
                      })
                    }
                  />
                </div>
              )}
            </div>
            <button className="btn-icon btn-remove" onClick={() => removeAction(idx)} title="Remove">
              ×
            </button>
          </div>
        ))}
      </fieldset>
    </div>
  );
}

function triggerLabel(trigger: AutomationTrigger): string {
  switch (trigger.type) {
    case 'on_boot':
      return 'On Boot';
    case 'time_interval':
      return `Every ${trigger.config.interval || '?'}`;
    case 'component_state':
      return trigger.event || 'State change';
    case 'value_range':
      return `Sensor ${trigger.config.direction || 'above'} ${trigger.config.threshold ?? '?'}`;
    case 'mqtt_message':
      return `MQTT: ${trigger.config.topic || '?'}`;
    default:
      return trigger.type;
  }
}
