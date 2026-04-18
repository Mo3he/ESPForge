import { useProject } from '../context/ProjectContext';

interface Props {
  activeTab: string;
  onNavigate: (tab: string) => void;
}

export default function StepGuide({ activeTab, onNavigate }: Props) {
  const { project } = useProject();
  const s = project.settings;

  const hasWifi = s.useSecrets || (s.wifiSsid.length > 0);
  const hasComponents = project.components.length > 0;
  const hasAutomations = project.automations.length > 0;
  const hasPinnable = project.components.some((c) => Object.keys(c.pins).length > 0);

  let message = '';
  let action = '';
  let nextTab = '';

  switch (activeTab) {
    case 'settings':
      if (!hasWifi) {
        message = 'Configure your device name and WiFi credentials, then add components.';
      } else if (!hasComponents) {
        message = 'Settings look good! Next, add some components to your device.';
        action = 'Add Components →';
        nextTab = 'components';
      } else {
        message = 'Settings configured. You can review components or export your YAML.';
        action = 'View Components →';
        nextTab = 'components';
      }
      break;

    case 'components':
      if (!hasComponents) {
        message = 'Browse categories on the left and click "+" to add components to your project.';
      } else if (hasPinnable) {
        message = `${project.components.length} component${project.components.length > 1 ? 's' : ''} added. Assign GPIO pins next.`;
        action = 'Assign Pins →';
        nextTab = 'pins';
      } else {
        message = `${project.components.length} component${project.components.length > 1 ? 's' : ''} added. You can add automations or export YAML.`;
        action = 'Add Automations →';
        nextTab = 'automations';
      }
      break;

    case 'pins':
      if (!hasComponents) {
        message = 'Add components first to see pin assignments here.';
        action = '← Add Components';
        nextTab = 'components';
      } else if (!hasAutomations) {
        message = 'Assign pins by clicking the dropdowns, then set up automations.';
        action = 'Add Automations →';
        nextTab = 'automations';
      } else {
        return null; // No guidance needed
      }
      break;

    case 'automations':
      if (!hasComponents) {
        message = 'Add components first — automations connect sensors to switches and lights.';
        action = '← Add Components';
        nextTab = 'components';
      } else if (!hasAutomations) {
        message = 'Create automations to make components interact (e.g. button toggles relay).';
      } else {
        message = `${project.automations.length} automation${project.automations.length > 1 ? 's' : ''} configured. Your project is ready to export!`;
      }
      break;

    default:
      return null;
  }

  if (!message) return null;

  return (
    <div className="step-guide">
      <span className="step-guide-icon">💡</span>
      <span className="step-guide-text">{message}</span>
      {action && nextTab && (
        <button className="btn btn-ghost step-guide-btn" onClick={() => onNavigate(nextTab)}>
          {action}
        </button>
      )}
    </div>
  );
}
