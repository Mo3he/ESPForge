import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertTriangle, Coffee, Cpu, FilePlus, FolderOpen, Link, Moon,
  MoreHorizontal, Redo2, Save, Sun, Undo2, X, XCircle, Download,
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { generateYaml, generateSecretsYaml } from '../utils/yamlGenerator';
import { importYaml } from '../utils/yamlImporter';
import { validateProject } from '../utils/validation';

interface HeaderProps {
  yamlOpen: boolean;
  onToggleYaml: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Header({ yamlOpen, onToggleYaml, activeTab, onTabChange }: HeaderProps) {
  const { project, dispatch, undo, redo, canUndo, canRedo } = useProject();
  const [theme, setTheme] = useState(() => localStorage.getItem('espforge-theme') || 'dark');
  const [showValidation, setShowValidation] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const moreRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreOpen]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('espforge-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const handleExport = useCallback(() => {
    const yamlStr = generateYaml(project);
    const blob = new Blob([yamlStr], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.settings.name || 'esphome'}.yaml`;
    a.click();
    URL.revokeObjectURL(url);

    // Also export secrets if using !secret
    if (project.settings.useSecretsWifi || project.settings.useSecretsApi || project.settings.useSecretsOta || project.settings.useSecretsMqtt) {
      const secretsStr = generateSecretsYaml(project);
      if (secretsStr) {
        const sBlob = new Blob([secretsStr], { type: 'text/yaml' });
        const sUrl = URL.createObjectURL(sBlob);
        const sA = document.createElement('a');
        sA.href = sUrl;
        sA.download = 'secrets.yaml';
        sA.click();
        URL.revokeObjectURL(sUrl);
      }
    }
  }, [project]);

  const handleSaveProject = useCallback(() => {
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.settings.name || 'espforge-project'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [project]);

  const handleLoadProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.yaml,.yml';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(text);
          dispatch({ type: 'LOAD_PROJECT', project: data });
        } else {
          const result = importYaml(text);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dispatch({ type: 'LOAD_PROJECT', project: result.project as any });
          if (result.warnings.length > 0) {
            alert('YAML imported with warnings:\n\n' + result.warnings.join('\n'));
          }
        }
      } catch (err) {
        alert(`Import failed: ${(err as Error).message}`);
      }
    };
    input.click();
  };

  const handleShareUrl = () => {
    const s = project.settings;
    const hasCredentials =
      s.wifiSsid || s.wifiPassword || s.apiKey || s.otaPassword || s.mqttPassword;

    if (hasCredentials) {
      const ok = confirm(
        'Your project contains credentials (WiFi password, API key, etc.).\n\n' +
        'Share links encode everything as Base64 — anyone with the link can read them.\n\n' +
        'Consider using the "Use !secret" options in Settings before sharing publicly.\n\n' +
        'Share anyway?'
      );
      if (!ok) return;
    }

    try {
      const json = JSON.stringify(project);
      const encoded = btoa(encodeURIComponent(json));
      const shareUrl = `${window.location.origin}${window.location.pathname}#project=${encoded}`;
      if (shareUrl.length > 8000) {
        alert('Project is too large to share via URL. Use Save/Load instead.');
        return;
      }
      navigator.clipboard.writeText(shareUrl);
      window.history.replaceState(null, '', `#project=${encoded}`);
      alert('Share link copied to clipboard!');
    } catch {
      alert('Failed to generate share link.');
    }
  };

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (mod && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
      if (mod && e.key === 'y') { e.preventDefault(); redo(); }
      if (mod && e.key === 's') { e.preventDefault(); handleSaveProject(); }
      if (mod && e.key === 'e') { e.preventDefault(); handleExport(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, handleSaveProject, handleExport]);

  const issues = project.board ? validateProject(project) : [];
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');

  const tabs = [
    { id: 'settings', label: 'Settings', count: 0 },
    { id: 'components', label: 'Components', count: project.components.length },
    { id: 'pins', label: 'Pin Map', count: 0 },
    { id: 'automations', label: 'Automations', count: project.automations.length },
  ];

  return (
    <>
      <header className="header">
        <div className="header-left">
          <div className="header-logo">
            <span className="header-title">ESPForge</span>
            {project.board && (
              editingName ? (
                <input
                  ref={nameInputRef}
                  className="header-project-name-input"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onBlur={() => {
                    const trimmed = nameValue.trim();
                    if (trimmed) dispatch({ type: 'UPDATE_SETTINGS', settings: { name: trimmed } });
                    setEditingName(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') { setEditingName(false); }
                  }}
                />
              ) : (
                <button
                  className="header-project-name"
                  onClick={() => { setNameValue(project.settings.name || ''); setEditingName(true); setTimeout(() => nameInputRef.current?.select(), 0); }}
                  title="Click to rename"
                >
                  {project.settings.name || 'Unnamed Project'}
                </button>
              )
            )}
          </div>

          {project.board && (
            <nav className="header-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => onTabChange(tab.id)}
                >
                  {tab.label}
                  {tab.count > 0 && <span className="tab-badge">{tab.count}</span>}
                </button>
              ))}
            </nav>
          )}
        </div>

        <div className="header-right">
          {project.board && (
            <>
              <button
                className="btn btn-ghost header-board-badge"
                onClick={() => {
                  if (project.components.length === 0 ||
                      confirm('Changing the board will clear all components and automations. Continue?')) {
                    onTabChange('board');
                  }
                }}
                title="Change board"
              >
                <Cpu size={14} /> {project.board.name}
              </button>
              <div className="btn-group header-btn-desktop">
                <button className="btn btn-ghost" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
                  <Undo2 size={16} />
                </button>
                <button className="btn btn-ghost" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
                  <Redo2 size={16} />
                </button>
              </div>
              <button className="btn btn-ghost header-btn-desktop" onClick={handleLoadProject} title="Load project">
                <FolderOpen size={16} />
              </button>
              <button
                className="btn btn-ghost header-btn-desktop"
                onClick={() => {
                  if (confirm('Start a new project? All unsaved changes will be lost.')) {
                    dispatch({ type: 'RESET_PROJECT' });
                    onTabChange('board');
                  }
                }}
                title="New project"
              >
                <FilePlus size={16} />
              </button>
              <button className="btn btn-ghost header-btn-desktop" onClick={handleSaveProject} title="Save project (Ctrl+S)">
                <Save size={16} />
              </button>
              <button className="btn btn-ghost header-btn-desktop" onClick={handleShareUrl} title="Copy share link">
                <Link size={16} />
              </button>
              {issues.length > 0 && (
                <button
                  className={`btn btn-ghost validation-btn ${errors.length > 0 ? 'has-errors' : 'has-warnings'}`}
                  onClick={() => setShowValidation(!showValidation)}
                  title={`${errors.length} errors, ${warnings.length} warnings`}
                >
                  {errors.length > 0 ? <XCircle size={16} /> : <AlertTriangle size={16} />} {issues.length}
                </button>
              )}
              <button
                className={`btn btn-ghost ${yamlOpen ? 'active' : ''}`}
                onClick={onToggleYaml}
                title="Toggle YAML preview"
              >
                {'{ }'}
              </button>
              <button className="btn btn-primary btn-export" onClick={handleExport}>
                <Download size={14} /> <span className="btn-export-label">Export YAML</span>
              </button>

              {/* Mobile-only more menu */}
              <div className="header-more-wrap" ref={moreRef}>
                <button
                  className="btn btn-ghost header-more-btn"
                  onClick={() => setMoreOpen(!moreOpen)}
                  title="More actions"
                >
                  <MoreHorizontal size={16} />
                </button>
                {moreOpen && (
                  <div className="header-more-menu" onClick={() => setMoreOpen(false)}>
                    <button className="more-menu-item" onClick={undo} disabled={!canUndo}>
                      <Undo2 size={15} /> Undo
                    </button>
                    <button className="more-menu-item" onClick={redo} disabled={!canRedo}>
                      <Redo2 size={15} /> Redo
                    </button>
                    <div className="more-menu-divider" />
                    <button className="more-menu-item" onClick={handleLoadProject}>
                      <FolderOpen size={15} /> Load project
                    </button>
                    <button className="more-menu-item" onClick={() => {
                      if (confirm('Start a new project? All unsaved changes will be lost.')) {
                        dispatch({ type: 'RESET_PROJECT' });
                        onTabChange('board');
                      }
                    }}>
                      <FilePlus size={15} /> New project
                    </button>
                    <button className="more-menu-item" onClick={handleSaveProject}>
                      <Save size={15} /> Save project
                    </button>
                    <button className="more-menu-item" onClick={handleShareUrl}>
                      <Link size={15} /> Copy share link
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
          <button className="btn btn-ghost" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <a
            href="https://github.com/mo3he/ESPForge"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
            title="View on GitHub"
          >
            <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
                0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
                -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66
                .07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15
                -.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27
                .68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12
                .51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48
                0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
          <a
            href="https://buymeacoffee.com/Mo3he"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost bmc-link"
            title="Buy me a coffee"
          >
            <Coffee size={16} />
          </a>
        </div>
      </header>

      {/* Validation panel */}
      {showValidation && issues.length > 0 && (
        <div className="validation-panel">
          <div className="validation-panel-header">
            <span>
              {errors.length > 0 && <span className="validation-count error">{errors.length} error{errors.length !== 1 ? 's' : ''}</span>}
              {warnings.length > 0 && <span className="validation-count warning">{warnings.length} warning{warnings.length !== 1 ? 's' : ''}</span>}
            </span>
            <button className="btn-icon" onClick={() => setShowValidation(false)}><X size={14} /></button>
          </div>
          <div className="validation-list">
            {issues.map((issue, i) => (
              <div
                key={i}
                className={`validation-item ${issue.level}`}
                onClick={() => { if (issue.tab) onTabChange(issue.tab); setShowValidation(false); }}
              >
                <span className="validation-icon">{issue.level === 'error' ? <XCircle size={14} /> : <AlertTriangle size={14} />}</span>
                <span>{issue.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
