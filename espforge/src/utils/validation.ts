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
  } else if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(s.name)) {
    issues.push({ level: 'error', message: 'Device name must be lowercase letters, numbers, and hyphens only (no spaces or special characters).', tab: 'settings' });
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

    // ── Field value validation ──
    for (const field of def.configFields) {
      const raw = inst.config[field.key];
      if (raw === undefined || raw === null || raw === '') continue;

      // Number fields must be numeric
      if (field.type === 'number') {
        const val = Number(raw);
        if (isNaN(val)) {
          issues.push({
            level: 'error',
            message: `${inst.name}: "${field.label}" must be a number.`,
            tab: 'components',
          });
          continue;
        }

        // LED count must be at least 1
        if (field.key === 'num_leds' && val < 1) {
          issues.push({
            level: 'error',
            message: `${inst.name}: "${field.label}" must be at least 1.`,
            tab: 'components',
          });
        }

        // Percentage fields must be 0–100
        if ((field.key === 'carrier_duty_percent' || field.key === 'tolerance') && (val < 0 || val > 100)) {
          issues.push({
            level: 'error',
            message: `${inst.name}: "${field.label}" must be between 0 and 100.`,
            tab: 'components',
          });
        }

        // Accuracy / decimal fields must be a non-negative integer
        if ((field.key === 'accuracy_decimals' || field.key === 'min_length') && (val < 0 || !Number.isInteger(val))) {
          issues.push({
            level: 'warning',
            message: `${inst.name}: "${field.label}" must be a non-negative integer.`,
            tab: 'components',
          });
        }

        // I2C address must be in valid 7-bit range (0–127)
        if (field.key === 'address' && (val < 0 || val > 127)) {
          issues.push({
            level: 'error',
            message: `${inst.name}: I2C address must be between 0x00 and 0x7F (0–127).`,
            tab: 'components',
          });
        }
      }
    }

    // Cross-field: min_value must be less than max_value
    const minVal = inst.config['min_value'];
    const maxVal = inst.config['max_value'];
    if (minVal !== undefined && maxVal !== undefined && Number(minVal) >= Number(maxVal)) {
      issues.push({
        level: 'error',
        message: `${inst.name}: Min Value must be less than Max Value.`,
        tab: 'components',
      });
    }

    // Cross-field: min_temperature must be less than max_temperature
    const minTemp = inst.config['min_temperature'];
    const maxTemp = inst.config['max_temperature'];
    if (minTemp !== undefined && maxTemp !== undefined && Number(minTemp) >= Number(maxTemp)) {
      issues.push({
        level: 'error',
        message: `${inst.name}: Min Temperature must be less than Max Temperature.`,
        tab: 'components',
      });
    }

    // Cross-field: min_length must be <= max_length
    const minLen = inst.config['min_length'];
    const maxLen = inst.config['max_length'];
    if (minLen !== undefined && maxLen !== undefined && Number(minLen) > Number(maxLen)) {
      issues.push({
        level: 'error',
        message: `${inst.name}: Min Length must not exceed Max Length.`,
        tab: 'components',
      });
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
