import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { importYaml } from '../utils/yamlImporter';

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ImportModal({ onClose, onSuccess }: Props) {
  const { dispatch } = useProject();
  const [pasteText, setPasteText] = useState('');
  const [error, setError] = useState('');

  const doImport = (text: string, isJson: boolean) => {
    try {
      if (isJson) {
        const data = JSON.parse(text);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dispatch({ type: 'LOAD_PROJECT', project: data as any });
      } else {
        const result = importYaml(text);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dispatch({ type: 'LOAD_PROJECT', project: result.project as any });
        if (result.warnings.length > 0) {
          alert('YAML imported with warnings:\n\n' + result.warnings.join('\n'));
        }
      }
      onClose();
      onSuccess?.();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handlePasteImport = () => {
    const text = pasteText.trim();
    if (!text) return;
    doImport(text, text.startsWith('{'));
  };

  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.yaml,.yml';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        doImport(text, file.name.endsWith('.json'));
      } catch (err) {
        setError((err as Error).message);
      }
    };
    input.click();
  };

  return (
    <div className="paste-modal-overlay" onClick={onClose}>
      <div className="paste-modal" onClick={(e) => e.stopPropagation()}>
        <div className="paste-modal-header">
          <span>Import Project</span>
          <button className="btn-icon" onClick={onClose}><X size={14} /></button>
        </div>
        <textarea
          className="paste-modal-textarea"
          placeholder="Paste your ESPHome YAML or ESPForge JSON project here…"
          value={pasteText}
          onChange={(e) => { setPasteText(e.target.value); setError(''); }}
          autoFocus
          spellCheck={false}
        />
        {error && <div className="paste-modal-error">{error}</div>}
        <div className="paste-modal-footer">
          <button className="btn btn-ghost" onClick={handleFileUpload}>
            <Upload size={14} /> Upload file
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handlePasteImport} disabled={!pasteText.trim()}>
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
