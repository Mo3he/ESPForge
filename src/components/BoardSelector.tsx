import { useState } from 'react';
import { Check } from 'lucide-react';
import { boards } from '../data/boards';
import { projectTemplates, type ProjectTemplate } from '../data/templates';
import { useProject } from '../context/ProjectContext';
import { Icon } from './Icon';
import type { Board } from '../types';

interface Props {
  onBoardSelected?: (tab?: string) => void;
}

export default function BoardSelector({ onBoardSelected }: Props) {
  const { dispatch } = useProject();
  const [search, setSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [step, setStep] = useState<'template' | 'board'>('template');

  const handleSelectBoard = (board: Board) => {
    dispatch({ type: 'SET_BOARD', board });

    // If a template was selected, load its components and automations
    if (selectedTemplate && selectedTemplate.id !== 'blank') {
      // Small delay to let the board set first, then load components via dispatch
      for (const comp of selectedTemplate.components) {
        dispatch({ type: 'ADD_COMPONENT', component: { ...comp } });
      }
      for (const auto of selectedTemplate.automations) {
        dispatch({ type: 'ADD_AUTOMATION', automation: { ...auto } });
      }
      if (selectedTemplate.settingsOverrides) {
        dispatch({ type: 'UPDATE_SETTINGS', settings: selectedTemplate.settingsOverrides as Record<string, string> });
      }
    }

    onBoardSelected?.('settings');
  };

  const handleSelectTemplate = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
    setStep('board');
  };

  const handleBackToTemplates = () => {
    setSelectedTemplate(null);
    setStep('template');
    setSearch('');
  };

  const query = search.toLowerCase();

  // If a template has recommended boards, show those first
  const sortedBoards = selectedTemplate && selectedTemplate.recommendedBoards.length > 0
    ? [...boards].sort((a, b) => {
        const aRec = selectedTemplate.recommendedBoards.includes(a.id) ? 0 : 1;
        const bRec = selectedTemplate.recommendedBoards.includes(b.id) ? 0 : 1;
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
          <p>Start with a template or build from scratch. No YAML knowledge required.</p>
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

        <div className="template-grid">
          {projectTemplates.map((t) => (
            <button
              key={t.id}
              className={`template-card ${t.id === 'blank' ? 'template-blank' : ''}`}
              onClick={() => handleSelectTemplate(t)}
            >
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
          ))}
        </div>
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
        {selectedTemplate && selectedTemplate.id !== 'blank' ? (
          <p>
            Template: <strong><Icon name={selectedTemplate.icon} size={14} className="inline-icon" /> {selectedTemplate.name}</strong>
            {selectedTemplate.recommendedBoards.length > 0 && ' — recommended boards shown first'}
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
          autoFocus
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
        {filteredBoards.length === 0 && (
          <p className="palette-empty" style={{ gridColumn: '1 / -1' }}>No boards match &ldquo;{search}&rdquo;</p>
        )}
        {filteredBoards.map((board) => {
          const isRecommended = selectedTemplate?.recommendedBoards.includes(board.id);
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
