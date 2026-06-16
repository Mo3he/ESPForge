import { describe, it, expect } from 'vitest';
import { generateYaml } from './yamlGenerator';
import { projectTemplates } from '../data/templates';
import { boards } from '../data/boards';
import { defaultSettings, reconcileComponents } from '../context/ProjectContext';
import type { Project, ProjectSettings, ComponentInstance } from '../types';

// A fixed, fully-populated settings object so generated YAML is deterministic
// and represents a complete, flashable config (WiFi + API key filled in).
const testSettings: ProjectSettings = {
  ...defaultSettings,
  name: 'test-device',
  friendlyName: 'Test Device',
  wifiSsid: 'TestNetwork',
  wifiPassword: 'test-password',
  apiKey: 'AABBCCDDEEFF00112233445566778899AABBCCDDEEFF001122334455667788',
};

/** Build a single-template Project the way the board selector would, using the
 *  template's first recommended board (falling back to esp32dev). */
function projectForTemplate(templateId: string): Project {
  const template = projectTemplates.find((t) => t.id === templateId)!;
  const boardId = template.recommendedBoards[0] ?? 'esp32dev';
  const board = boards.find((b) => b.id === boardId) ?? boards.find((b) => b.id === 'esp32dev')!;

  const boardDefaults: ComponentInstance[] = (board.defaultComponents ?? []).map((dc, i) => ({
    ...dc,
    id: `dc_${i + 1}`,
  }));

  return {
    board,
    settings: { ...testSettings, ...(template.settingsOverrides as Partial<ProjectSettings>) },
    components: reconcileComponents(boardDefaults, template.components),
    automations: template.automations,
  };
}

describe('generateYaml — template golden files', () => {
  for (const template of projectTemplates) {
    it(`generates stable YAML for "${template.id}"`, () => {
      const yaml = generateYaml(projectForTemplate(template.id));
      expect(yaml).toMatchSnapshot();
    });
  }
});

describe('generateYaml — basics', () => {
  it('returns a placeholder when no board is selected', () => {
    const project: Project = {
      board: null,
      settings: testSettings,
      components: [],
      automations: [],
    };
    expect(generateYaml(project)).toContain('Select a board');
  });

  it('emits an esp32 block for an esp32 board', () => {
    const yaml = generateYaml(projectForTemplate('blank'));
    expect(yaml).toContain('esp32:');
    expect(yaml).toContain('name: test-device');
    expect(yaml).toContain('ssid: TestNetwork');
  });

  it('converts __SECRET__ markers into !secret references', () => {
    const project = projectForTemplate('blank');
    project.settings = { ...project.settings, useSecretsWifi: true };
    const yaml = generateYaml(project);
    expect(yaml).toContain('!secret wifi_ssid');
    expect(yaml).not.toContain('__SECRET__');
  });
});
