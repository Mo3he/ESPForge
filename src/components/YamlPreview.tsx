import { useMemo, useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { generateYaml } from '../utils/yamlGenerator';

interface Props {
  open: boolean;
  onClose: () => void;
  width?: number;
}

export default function YamlPreview({ open, onClose, width = 420 }: Props) {
  const { project } = useProject();
  const [copied, setCopied] = useState(false);

  const yamlStr = useMemo(() => generateYaml(project), [project]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(yamlStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!open) return null;

  return (
    <div className="yaml-panel" style={{ width }}>
      <div className="yaml-panel-header">
        <h3>YAML Preview</h3>
        <div className="yaml-panel-actions">
          <button className="btn btn-sm btn-ghost" onClick={handleCopy} title="Copy to clipboard">
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied!' : 'Copy'}
          </button>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="yaml-panel-body">
        <pre className="yaml-code">
          <code>{colorizeYaml(yamlStr)}</code>
        </pre>
      </div>
    </div>
  );
}

/** Simple YAML syntax highlighter that returns React elements */
function colorizeYaml(yaml: string): React.ReactNode {
  const lines = yaml.split('\n');
  return lines.map((line, i) => {
    // Comment
    if (line.trimStart().startsWith('#')) {
      return (
        <span key={i}>
          <span className="yaml-comment">{line}</span>{'\n'}
        </span>
      );
    }

    // Key: value
    const match = line.match(/^(\s*)([\w.\-/]+)(:)(.*)/);
    if (match) {
      const [, indent, key, colon, rest] = match;
      return (
        <span key={i}>
          {indent}
          <span className="yaml-key">{key}</span>
          <span className="yaml-colon">{colon}</span>
          {colorizeValue(rest)}
          {'\n'}
        </span>
      );
    }

    // List item
    const listMatch = line.match(/^(\s*)(- )(.*)/);
    if (listMatch) {
      const [, indent, dash, rest] = listMatch;
      return (
        <span key={i}>
          {indent}
          <span className="yaml-dash">{dash}</span>
          {colorizeValue(rest)}
          {'\n'}
        </span>
      );
    }

    return <span key={i}>{line}{'\n'}</span>;
  });
}

function colorizeValue(val: string): React.ReactNode {
  const trimmed = val.trim();

  // Empty
  if (!trimmed) return val;

  // Quoted string
  if (/^["'].*["']$/.test(trimmed)) {
    return <span className="yaml-string">{val}</span>;
  }

  // Boolean
  if (/^(true|false)$/i.test(trimmed)) {
    return <span className="yaml-bool">{val}</span>;
  }

  // Number
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return <span className="yaml-number">{val}</span>;
  }

  // !secret
  if (trimmed.startsWith('!secret')) {
    return <span className="yaml-secret">{val}</span>;
  }

  return <span className="yaml-value">{val}</span>;
}
