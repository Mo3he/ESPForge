import { useState } from 'react';
import { Check, Upload } from 'lucide-react';
import { boards } from '../data/boards';
import { projectTemplates, type ProjectTemplate } from '../data/templates';
import { useProject } from '../context/ProjectContext';
import { Icon } from './Icon';
import ImportModal from './ImportModal';
import type { Board, ComponentInstance, Automation } from '../types';

interface Props {
  onBoardSelected?: (tab?: string) => void;
}

type CustomBoardVariant = 'esp32' | 'esp32s2' | 'esp32s3' | 'esp32c3' | 'esp32c5' | 'esp32c6' | 'esp32h2';

/** Merge components from multiple templates, deduplicating shared utility components by type. */
function mergeTemplates(templates: ProjectTemplate[]): {
  components: ComponentInstance[];
  automations: Automation[];
  settingsOverrides: Record<string, unknown>;
} {
  const seenTypes = new Set<string>();
  const mergedComponents: ComponentInstance[] = [];
  const idMap = new Map<string, string>(); // old template ID -> new merged ID
  let nextId = 1;

  for (const template of templates) {
    for (const comp of template.components) {
      if (seenTypes.has(comp.type)) {
        // Map duplicate to the already-added component's ID
        const existing = mergedComponents.find((c) => c.type === comp.type);
        if (existing) idMap.set(comp.id, existing.id);
        continue;
      }
      seenTypes.add(comp.type);
      const newId = `tpl_${nextId++}`;
      idMap.set(comp.id, newId);
      mergedComponents.push({ ...comp, id: newId });
    }
  }

  let autoIdx = 1;
  const mergedAutomations: Automation[] = [];
  for (const template of templates) {
    for (const auto of template.automations) {
      const newAutoId = `auto_${autoIdx++}`;
      mergedAutomations.push({
        ...auto,
        id: newAutoId,
        trigger: {
          ...auto.trigger,
          componentId: auto.trigger.componentId
            ? idMap.get(auto.trigger.componentId) ?? auto.trigger.componentId
            : auto.trigger.componentId,
        },
        actions: auto.actions.map((act, i) => ({
          ...act,
          id: `${newAutoId}_act_${i + 1}`,
          config: {
            ...act.config,
            targetId: act.config.targetId
              ? idMap.get(act.config.targetId as string) ?? act.config.targetId
              : act.config.targetId,
          },
        })),
      });
    }
  }

  const settingsOverrides: Record<string, unknown> = {};
  for (const template of templates) {
    if (template.settingsOverrides) Object.assign(settingsOverrides, template.settingsOverrides);
  }

  return { components: mergedComponents, automations: mergedAutomations, settingsOverrides };
}

export default function BoardSelector({ onBoardSelected }: Props) {
  const { dispatch } = useProject();
  const [search, setSearch] = useState('');
  const [selectedTemplates, setSelectedTemplates] = useState<ProjectTemplate[]>([]);
  const [step, setStep] = useState<'template' | 'board'>('template');
  const [importOpen, setImportOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customPlatform, setCustomPlatform] = useState<'esp32' | 'esp8266'>('esp32');
  const [customVariant, setCustomVariant] = useState<CustomBoardVariant>('esp32');
  const [customBoardId, setCustomBoardId] = useState('');

  const handleSelectBoard = (board: Board) => {
    dispatch({ type: 'SET_BOARD', board });

    if (selectedTemplates.length > 0) {
      const { components, automations, settingsOverrides } = mergeTemplates(selectedTemplates);
      for (const comp of components) {
        dispatch({ type: 'ADD_COMPONENT', component: comp });
      }
      for (const auto of automations) {
        dispatch({ type: 'ADD_AUTOMATION', automation: auto });
      }
      if (Object.keys(settingsOverrides).length > 0) {
        dispatch({ type: 'UPDATE_SETTINGS', settings: settingsOverrides as Record<string, string> });
      }
    }

    onBoardSelected?.('settings');
  };

  const handleSelectCustomBoard = () => {
    const boardId = customBoardId.trim() || (customPlatform === 'esp8266' ? 'nodemcuv2' : 'esp32dev');
    const customBoard: Board = {
      id: 'custom',
      name: 'Custom Board',
      platform: customPlatform,
      variant: customPlatform === 'esp8266' ? undefined : customVariant,
      board: boardId,
      description: `Custom board: ${boardId}`,
      pins: [],
    };
    handleSelectBoard(customBoard);
  };

  const handleToggleTemplate = (template: ProjectTemplate) => {
    // "Blank Project" goes straight to board selection with no templates
    if (template.id === 'blank') {
      setSelectedTemplates([]);
      setStep('board');
      return;
    }
    setSelectedTemplates((prev) => {
      const exists = prev.find((t) => t.id === template.id);
      if (exists) return prev.filter((t) => t.id !== template.id);
      return [...prev, template];
    });
  };

  const handleContinue = () => {
    if (selectedTemplates.length > 0) setStep('board');
  };

  const handleBackToTemplates = () => {
    setStep('template');
    setSearch('');
  };

  const query = search.toLowerCase();

  // Collect recommended boards from all selected templates
  const allRecommended = new Set(selectedTemplates.flatMap((t) => t.recommendedBoards));
  const sortedBoards = allRecommended.size > 0
    ? [...boards].sort((a, b) => {
        const aRec = allRecommended.has(a.id) ? 0 : 1;
        const bRec = allRecommended.has(b.id) ? 0 : 1;
        return aRec - bRec;
      })
    : boards;

  const filteredBoards = sortedBoards.filter(
    (b) =>
      b.name.toLowerCase().includes(query) ||
      b.description.toLowerCase().includes(query) ||
      b.platform.toLowerCase().includes(query) ||
      (b.variant && b.variant.toLowerCase().includes(query)),
  );

  // ── Step 1: Pick a Template ──
  if (step === 'template') {
    return (
      <div className="board-selector">
        <div className="board-selector-header">
          <h1>Welcome to ESPForge</h1>
          <p>Pick one or more templates to combine, or start from scratch. No YAML knowledge required.</p>
        </div>

        <div className="onboarding-steps">
          <div className="step active">
            <div className="step-num">1</div>
            <span>Choose Template</span>
          </div>
          <div className="step-line" />
          <div className="step">
            <div className="step-num">2</div>
            <span>Select Board</span>
          </div>
          <div className="step-line" />
          <div className="step">
            <div className="step-num">3</div>
            <span>Configure</span>
          </div>
        </div>

        {selectedTemplates.length > 0 && (
          <div className="template-continue">
            <span className="template-continue-count">
              {selectedTemplates.length} template{selectedTemplates.length > 1 ? 's' : ''} selected
            </span>
            <button className="btn btn-primary" onClick={handleContinue}>
              Continue to Board Selection →
            </button>
          </div>
        )}

        <div className="template-grid">
          {projectTemplates.slice(0, 1).map((t) => (
            <button
              key={t.id}
              className={`template-card ${t.id === 'blank' ? 'template-blank' : ''}`}
              onClick={() => handleToggleTemplate(t)}
            >
              <div className="template-icon"><Icon name={t.icon} size={28} strokeWidth={1.25} /></div>
              <div className="template-info">
                <h3>{t.name}</h3>
                <p>{t.description}</p>
              </div>
            </button>
          ))}
          <button className="template-card template-import" onClick={() => setImportOpen(true)}>
            <div className="template-icon"><Upload size={28} strokeWidth={1.25} /></div>
            <div className="template-info">
              <h3>Import Project</h3>
              <p>Load a saved <code>.json</code> project or an existing ESPHome <code>.yaml</code> file.</p>
            </div>
          </button>
          {projectTemplates.slice(1).map((t) => {
            const isSelected = selectedTemplates.some((s) => s.id === t.id);
            return (
              <button
                key={t.id}
                className={`template-card ${isSelected ? 'template-selected' : ''}`}
                onClick={() => handleToggleTemplate(t)}
              >
                {isSelected && (
                  <div className="template-check">
                    <Check size={16} />
                  </div>
                )}
                <div className="template-icon"><Icon name={t.icon} size={28} strokeWidth={1.25} /></div>
                <div className="template-info">
                  <h3>{t.name}</h3>
                  <p>{t.description}</p>
                  {t.components.length > 0 && (
                    <div className="template-meta">
                      <span className="badge">{t.components.length} components</span>
                      {t.automations.length > 0 && (
                        <span className="badge">{t.automations.length} automation{t.automations.length > 1 ? 's' : ''}</span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {importOpen && (
          <ImportModal onClose={() => setImportOpen(false)} onSuccess={() => onBoardSelected?.('settings')} />
        )}
      </div>
    );
  }

  // ── Step 2: Pick a Board ──
  return (
    <div className="board-selector">
      <div className="board-selector-header">
        <button className="btn btn-ghost back-btn" onClick={handleBackToTemplates}>
          ← Back to Templates
        </button>
        <h1>Select Your Board</h1>
        {selectedTemplates.length > 0 ? (
          <p>
            Templates: {selectedTemplates.map((t, i) => (
              <span key={t.id}>
                {i > 0 && ', '}
                <strong><Icon name={t.icon} size={14} className="inline-icon" /> {t.name}</strong>
              </span>
            ))}
            {allRecommended.size > 0 && ' - recommended boards shown first'}
          </p>
        ) : (
          <p>Choose the ESP board you&apos;re using.</p>
        )}
        <input
          className="search-input"
          type="text"
          placeholder="Search boards... (e.g. S3, C3, Sonoff, M5Stack)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="onboarding-steps">
        <div className="step completed" onClick={handleBackToTemplates} style={{ cursor: 'pointer' }}>
          <div className="step-num"><Check size={14} /></div>
          <span>Choose Template</span>
        </div>
        <div className="step-line active" />
        <div className="step active">
          <div className="step-num">2</div>
          <span>Select Board</span>
        </div>
        <div className="step-line" />
        <div className="step">
          <div className="step-num">3</div>
          <span>Configure</span>
        </div>
      </div>

      <div className="board-grid">
        {filteredBoards.length === 0 && !customOpen && (
          <p className="palette-empty" style={{ gridColumn: '1 / -1' }}>No boards match &ldquo;{search}&rdquo;</p>
        )}

        {/* Custom Board card — always first, hidden when search has text */}
        {!search && (
          <div className={`board-card custom-board-card ${customOpen ? 'custom-board-open' : ''}`}>
            {!customOpen ? (
              <button className="custom-board-trigger" onClick={() => setCustomOpen(true)}>
                <div className="board-card-chip">
                  <svg viewBox="0 0 60 80" width="60" height="80">
                    <rect x="5" y="5" width="50" height="70" rx="4" fill="var(--bg-tertiary)" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeDasharray="4 3" />
                    <text x="30" y="42" textAnchor="middle" fill="var(--text-tertiary)" fontSize="18" fontFamily="monospace">?</text>
                  </svg>
                </div>
                <div className="board-card-info">
                  <h3>Custom Board</h3>
                  <p>My board isn&apos;t listed. Enter the ESPHome board identifier manually.</p>
                  <div className="board-card-meta">
                    <span className="badge badge-outline">Custom</span>
                  </div>
                </div>
              </button>
            ) : (
              <div className="custom-board-form">
                <h3>Custom Board Setup</h3>
                <div className="custom-board-fields">
                  <label>
                    <span>Platform</span>
                    <select
                      value={customPlatform}
                      onChange={(e) => {
                        setCustomPlatform(e.target.value as 'esp32' | 'esp8266');
                        if (e.target.value === 'esp8266') setCustomVariant('esp32');
                      }}
                    >
                      <option value="esp32">ESP32</option>
                      <option value="esp8266">ESP8266</option>
                    </select>
                  </label>
                  {customPlatform === 'esp32' && (
                    <label>
                      <span>Variant</span>
                      <select value={customVariant} onChange={(e) => setCustomVariant(e.target.value as CustomBoardVariant)}>
                        <option value="esp32">ESP32 (original)</option>
                        <option value="esp32s2">ESP32-S2</option>
                        <option value="esp32s3">ESP32-S3</option>
                        <option value="esp32c3">ESP32-C3</option>
                        <option value="esp32c5">ESP32-C5</option>
                        <option value="esp32c6">ESP32-C6</option>
                        <option value="esp32h2">ESP32-H2</option>
                      </select>
                    </label>
                  )}
                  <label>
                    <span>ESPHome Board ID</span>
                    <input
                      type="text"
                      placeholder={customPlatform === 'esp8266' ? 'e.g. nodemcuv2' : 'e.g. esp32dev'}
                      value={customBoardId}
                      onChange={(e) => setCustomBoardId(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSelectCustomBoard(); }}
                    />
                    <small>Find your board ID at <a href="https://registry.platformio.org/platforms/platformio/espressif32/boards" target="_blank" rel="noreferrer">PlatformIO board registry</a></small>
                  </label>
                </div>
                <div className="custom-board-actions">
                  <button className="btn btn-ghost" onClick={() => setCustomOpen(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSelectCustomBoard}>Use This Board →</button>
                </div>
              </div>
            )}
          </div>
        )}

        {filteredBoards.map((board) => {
          const isRecommended = allRecommended.has(board.id);
          return (
            <button
              key={board.id}
              className={`board-card ${isRecommended ? 'board-recommended' : ''}`}
              onClick={() => handleSelectBoard(board)}
            >
              {isRecommended && <span className="recommended-badge">Recommended</span>}
              <div className="board-card-chip">
                <svg viewBox="0 0 60 80" width="60" height="80">
                  <rect x="5" y="5" width="50" height="70" rx="4" fill="var(--bg-tertiary)" stroke="var(--accent)" strokeWidth="1.5" />
                  {board.pins.filter((p) => p.side === 'left').slice(0, 8).map((_, i) => (
                    <circle key={`l${i}`} cx="2" cy={15 + i * 8} r="1.5" fill="var(--green)" />
                  ))}
                  {board.pins.filter((p) => p.side === 'right').slice(0, 8).map((_, i) => (
                    <circle key={`r${i}`} cx="58" cy={15 + i * 8} r="1.5" fill="var(--green)" />
                  ))}
                  <rect x="18" y="65" width="24" height="10" rx="2" fill="var(--bg-elevated)" />
                  <rect x="16" y="25" width="28" height="20" rx="2" fill="var(--bg-elevated)" />
                  <text x="30" y="37" textAnchor="middle" fill="var(--text-secondary)" fontSize="6" fontFamily="monospace">
                    {board.platform === 'esp32' ? 'ESP32' : 'ESP8266'}
                  </text>
                </svg>
              </div>
              <div className="board-card-info">
                <h3>{board.name}</h3>
                <p>{board.description}</p>
                <div className="board-card-meta">
                  <span className="badge">{board.platform.toUpperCase()}</span>
                  <span className="badge">{board.pins.length} GPIO</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
