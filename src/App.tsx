import { useState, useEffect, useRef, useCallback } from 'react';
import { useProject } from './context/ProjectContext';
import Header from './components/Header';
import StepGuide from './components/StepGuide';
import BoardSelector from './components/BoardSelector';
import ComponentPalette from './components/ComponentPalette';
import ComponentConfig from './components/ComponentConfig';
import PinMapper from './components/PinMapper';
import AutomationBuilder from './components/AutomationBuilder';
import SettingsPanel from './components/SettingsPanel';
import YamlPreview from './components/YamlPreview';

export default function App() {
  const { project, dispatch } = useProject();
  const [activeTab, setActiveTab] = useState('settings');
  const [paletteWidth, setPaletteWidth] = useState(320);
  const isPaletteDragging = useRef(false);
  const paletteDragStartX = useRef(0);
  const paletteDragStartWidth = useRef(0);

  const onPaletteDragStart = useCallback((e: React.MouseEvent) => {
    isPaletteDragging.current = true;
    paletteDragStartX.current = e.clientX;
    paletteDragStartWidth.current = paletteWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [paletteWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isPaletteDragging.current) return;
      const delta = e.clientX - paletteDragStartX.current;
      const next = Math.min(600, Math.max(200, paletteDragStartWidth.current + delta));
      setPaletteWidth(next);
    };
    const onUp = () => {
      if (!isPaletteDragging.current) return;
      isPaletteDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const [yamlOpen, setYamlOpen] = useState(true);
  const [yamlWidth, setYamlWidth] = useState(420);

  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = yamlWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [yamlWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = dragStartX.current - e.clientX;
      const next = Math.min(800, Math.max(280, dragStartWidth.current + delta));
      setYamlWidth(next);
    };
    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const hash = window.location.hash;
      if (hash.startsWith('#project=')) {
        const encoded = hash.slice('#project='.length);
        const json = decodeURIComponent(atob(encoded));
        const data = JSON.parse(json);
        dispatch({ type: 'LOAD_PROJECT', project: data });
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch {
      // Invalid share link — ignore
    }
  }, [dispatch]);

  // If no board selected or user wants to change board, show the board selector
  if (!project.board || activeTab === 'board') {
    return (
      <div className="app">
        <Header
          yamlOpen={false}
          onToggleYaml={() => {}}
          activeTab="board"
          onTabChange={(tab) => {
            if (tab !== 'board' && project.board) setActiveTab(tab);
          }}
        />
        <div className="workspace-scroll">
          <BoardSelector onBoardSelected={(tab) => setActiveTab(tab || 'settings')} />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        yamlOpen={yamlOpen}
        onToggleYaml={() => setYamlOpen(!yamlOpen)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className={`workspace ${yamlOpen ? 'with-yaml' : ''}`}>
        <main className="main-content">
          <StepGuide activeTab={activeTab} onNavigate={setActiveTab} />
          {activeTab === 'components' && (
            <div className="components-layout">
              <ComponentPalette
                onSelectComponent={setSelectedComponentId}
                selectedComponentId={selectedComponentId}
                width={paletteWidth}
              />
              <div className="palette-resize-handle" onMouseDown={onPaletteDragStart} />
              <ComponentConfig componentId={selectedComponentId || ''} />
            </div>
          )}
          {activeTab === 'pins' && <PinMapper />}
          {activeTab === 'automations' && <AutomationBuilder />}
          {activeTab === 'settings' && <SettingsPanel />}
        </main>

        {yamlOpen && (
          <div className="yaml-resize-handle" onMouseDown={onDragStart} />
        )}
        <YamlPreview open={yamlOpen} onClose={() => setYamlOpen(false)} width={yamlWidth} />
      </div>
    </div>
  );
}
