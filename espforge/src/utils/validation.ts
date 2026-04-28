import type { Project, ComponentInstance } from '../types';
import { getDefinition } from '../data/components';

export interface ValidationIssue {
  level: 'error' | 'warning';
  message: string;
  tab?: string; // which tab to navigate to
}

export function validateProject(project: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!project.board) return issues;

  const s = project.settings;

  // ── Settings validation ──
  if (!s.name || s.name === 'my-esp-device') {
    issues.push({ level: 'warning', message: 'Device name is still the default — consider renaming.', tab: 'settings' });
  }

  if (!s.useSecretsWifi && !s.wifiSsid) {
    issues.push({ level: 'error', message: 'WiFi SSID is not configured.', tab: 'settings' });
  }

  if (!s.useSecretsWifi && !s.wifiPassword) {
    issues.push({ level: 'warning', message: 'WiFi password is empty.', tab: 'settings' });
  }

  if (s.apiEnabled && !s.useSecretsApi && !s.apiKey) {
    issues.push({ level: 'warning', message: 'API encryption key is empty — generate one for security.', tab: 'settings' });
  }

  // ── Component validation ──
  for (const inst of project.components) {
    const def = getDefinition(inst.type);
    if (!def) continue;

    // Check required config fields
    for (const field of def.configFields) {
      if (field.required && !inst.config[field.key]) {
        issues.push({
          level: 'error',
          message: `${inst.name}: required field "${field.label}" is empty.`,
          tab: 'components',
        });
      }
    }

    // Check unassigned pins — skip if the component delegates pin management to an external output
    const hasExternalOutput = Object.keys(inst.config).some((k) => k.startsWith('_outputId'));
    for (const pinReq of def.pins) {
      if (!pinReq.optional && inst.pins[pinReq.role] == null && !hasExternalOutput) {
        issues.push({
          level: 'warning',
          message: `${inst.name}: pin "${pinReq.label}" is not assigned.`,
          tab: 'pins',
        });
      }
    }
  }

  // ── IR/RF Proxy requires at least one transmitter or receiver ──
  const hasIrProxy = project.components.some((c) => c.type === 'ir.proxy');
  const hasIrTransmitter = project.components.some((c) => c.type === 'ir.transmitter');
  const hasIrReceiver = project.components.some((c) => c.type === 'ir.receiver');
  if (hasIrProxy && !hasIrTransmitter && !hasIrReceiver) {
    issues.push({
      level: 'warning',
      message: 'IR/RF Proxy requires at least one IR Transmitter or IR Receiver component to reference.',
      tab: 'components',
    });
  }

  // ── Pin conflict detection ──
  const pinUsage = new Map<number, ComponentInstance[]>();
  for (const inst of project.components) {
    for (const [, gpio] of Object.entries(inst.pins)) {
      if (gpio == null) continue;
      if (!pinUsage.has(gpio)) pinUsage.set(gpio, []);
      pinUsage.get(gpio)!.push(inst);
    }
  }
  for (const [gpio, users] of pinUsage) {
    if (users.length > 1) {
      // Suppress false conflicts between an output component and the component that references it
      if (users.length === 2) {
        const outputInst = users.find((u) => u.type.startsWith('output.'));
        const parentInst = users.find((u) => !u.type.startsWith('output.'));
        if (outputInst && parentInst) {
          const outputName = String(outputInst.config.name || '');
          const isLinked = Object.entries(parentInst.config).some(
            ([k, v]) => k.startsWith('_outputId') && v === outputName,
          );
          if (isLinked) continue;
        }
      }
      const names = users.map((u) => (u.config.name as string) || u.name);
      issues.push({
        level: 'error',
        message: `GPIO${gpio} is used by multiple components: ${names.join(', ')}`,
        tab: 'pins',
      });
    }
  }

  return issues;
}
