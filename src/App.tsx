import { useState, useEffect } from 'react';
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
  const [yamlOpen, setYamlOpen] = useState(true);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);

  // ── Load shared project from URL hash ──
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
              />
              <ComponentConfig componentId={selectedComponentId || ''} />
            </div>
          )}
          {activeTab === 'pins' && <PinMapper />}
          {activeTab === 'automations' && <AutomationBuilder />}
          {activeTab === 'settings' && <SettingsPanel />}
        </main>

        <YamlPreview open={yamlOpen} onClose={() => setYamlOpen(false)} />
      </div>
    </div>
  );
}
