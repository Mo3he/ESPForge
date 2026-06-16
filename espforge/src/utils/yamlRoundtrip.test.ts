import { describe, it, expect } from 'vitest';
import { generateYaml } from './yamlGenerator';
import { importYaml } from './yamlImporter';
import { projectTemplates } from '../data/templates';
import { boards } from '../data/boards';
import { defaultSettings, reconcileComponents } from '../context/ProjectContext';
import type { Project, ProjectSettings, ComponentInstance } from '../types';

const testSettings: ProjectSettings = {
  ...defaultSettings,
  name: 'test-device',
  friendlyName: 'Test Device',
  wifiSsid: 'TestNetwork',
  wifiPassword: 'test-password',
  apiKey: 'AABBCCDDEEFF00112233445566778899AABBCCDDEEFF001122334455667788',
};

/**
 * Component types the generator emits but the importer does NOT yet reconstruct.
 * A config containing one of these survives a round trip *except* for that
 * component, which is dropped on import. The list is asserted to be exact below:
 * adding importer support for a type means removing it here, and a previously
 * supported type that starts dropping will fail the regression check.
 *
 * Currently empty — every component type emitted by the templates round-trips.
 */
const KNOWN_IMPORT_GAPS = new Set<string>([]);

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

describe('generate → import round-trip', () => {
  for (const template of projectTemplates) {
    it(`preserves core fields for "${template.id}"`, () => {
      const original = projectForTemplate(template.id);
      const { project: imported } = importYaml(generateYaml(original));

      // The PlatformIO board id survives the round trip. (We compare this
      // rather than the ESPForge board id because several ESPForge boards share
      // a PlatformIO id — e.g. esp01 and sonoff_basic both map to esp01_1m — so
      // the exact entry isn't recoverable from YAML alone.)
      expect(imported.board?.board).toBe(original.board!.board);
      expect(imported.settings?.name).toBe('test-device');
      expect(imported.settings?.friendlyName).toBe('Test Device');
      expect(imported.settings?.wifiSsid).toBe('TestNetwork');

      // Every supported component type in the template is recovered on import.
      const importedTypes = (imported.components ?? []).map((c) => c.type);
      const expectedTypes = original.components
        .map((c) => c.type)
        .filter((t) => !KNOWN_IMPORT_GAPS.has(t));
      for (const type of expectedTypes) {
        expect(importedTypes).toContain(type);
      }
    });
  }

  it('recovers IR + climate component config (not just the type)', () => {
    const { project } = importYaml(generateYaml(projectForTemplate('ir_blaster')));
    const byType = (t: string) => (project.components ?? []).find((c) => c.type === t);

    expect(byType('ir.transmitter')?.config.carrier_duty_percent).toBe(50);

    const receiver = byType('ir.receiver');
    expect(receiver?.config.dump).toBe('all');
    expect(receiver?.config.tolerance).toBe(25);

    const climate = byType('climate.ir');
    expect(climate?.config.protocol).toBe('daikin');
    expect(climate?.config.name).toBe('Air Conditioner');
  });

  it('recovers nested sub-entity names (BME280, wifi_info)', () => {
    const { project } = importYaml(generateYaml(projectForTemplate('environment_monitor')));
    const bme = (project.components ?? []).find((c) => c.type === 'sensor.bme280');
    expect(bme?.config.temperature_name).toBe('Temperature');
    expect(bme?.config.humidity_name).toBe('Humidity');
    expect(bme?.config.address).toBe('0x76');

    const wifiInfo = (project.components ?? []).find((c) => c.type === 'text_sensor.wifi_info');
    expect(wifiInfo?.config.ip_address_name).toBe('IP Address');
    expect(wifiInfo?.config.ssid_name).toBe('Connected SSID');
  });

  it('recovers the bluetooth proxy and ir/rf proxy blocks', () => {
    const ble = importYaml(generateYaml(projectForTemplate('ble_gateway'))).project;
    expect((ble.components ?? []).some((c) => c.type === 'bluetooth.proxy')).toBe(true);

    const proxy = importYaml(generateYaml(projectForTemplate('ir_rf_proxy'))).project;
    const irProxy = (proxy.components ?? []).find((c) => c.type === 'ir.proxy');
    expect(irProxy?.config.receiver_frequency).toBe('38kHz');
  });

  it('the set of non-round-tripping component types matches the known gaps', () => {
    const actualGaps = new Set<string>();
    for (const template of projectTemplates) {
      const original = projectForTemplate(template.id);
      const { project: imported } = importYaml(generateYaml(original));
      const importedTypes = (imported.components ?? []).map((c) => c.type);
      for (const c of original.components) {
        if (!importedTypes.includes(c.type)) actualGaps.add(c.type);
      }
    }
    expect([...actualGaps].sort()).toEqual([...KNOWN_IMPORT_GAPS].sort());
  });
});
