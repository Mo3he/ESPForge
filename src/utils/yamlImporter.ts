import * as yaml from 'js-yaml';
import type { Project, ProjectSettings, ComponentInstance } from '../types';
import { boards } from '../data/boards';
import { componentDefinitions } from '../data/components';

export interface ImportResult {
  project: Partial<Project>;
  warnings: string[];
}

function parseGpioNum(val: unknown): number | null {
  if (val == null) return null;
  const s = String(val);
  const m = s.match(/^GPIO(\d+)$/i);
  if (m) return parseInt(m[1], 10);
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  return null;
}

function extractPin(entry: Record<string, unknown>, role: string, onlyPin: boolean): number | null {
  let raw = entry[role];
  // For single-pin components, also try the bare 'pin' key
  if (raw === undefined && onlyPin && role !== 'pin') raw = entry['pin'];
  // Handle nested { number: 'GPIO4', mode: ..., inverted: ... }
  if (raw && typeof raw === 'object' && 'number' in (raw as object)) {
    raw = (raw as Record<string, unknown>).number;
  }
  return parseGpioNum(raw);
}

function isSecret(val: unknown): boolean {
  return typeof val === 'string' && val.startsWith('__SECRET__');
}

function strVal(val: unknown, fallback = ''): string {
  if (val == null) return fallback;
  return String(val);
}

const COMPONENT_DOMAINS = [
  'sensor', 'binary_sensor', 'switch', 'light', 'output',
  'display', 'climate', 'fan', 'cover', 'button', 'number',
  'select', 'lock', 'text',
];

export function importYaml(text: string): ImportResult {
  const warnings: string[] = [];

  // Pre-process: neutralise !secret tags so js-yaml doesn't choke on them
  const preprocessed = text.replace(/:\s*!secret\s+(\S+)/g, ': "__SECRET__$1"');

  let doc: Record<string, unknown>;
  try {
    doc = yaml.load(preprocessed) as Record<string, unknown>;
  } catch (e) {
    throw new Error(`YAML parse error: ${(e as Error).message}`);
  }

  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new Error('Invalid YAML: expected a mapping at top level.');
  }

  // ── Board ────────────────────────────────────────────────────
  let board = null;
  const platformKey = doc.esp32 ? 'esp32' : doc.esp8266 ? 'esp8266' : null;
  if (platformKey) {
    const platformDoc = doc[platformKey] as Record<string, unknown> | null;
    const boardId = strVal(platformDoc?.board);
    if (boardId) {
      board = boards.find((b) => b.board === boardId) ?? null;
      if (!board) warnings.push(`Board "${boardId}" is not in ESPForge's board list. Select your board manually after import.`);
    }
  } else {
    warnings.push('No esp32/esp8266 section found. Select your board manually after import.');
  }

  // ── Settings ─────────────────────────────────────────────────
  const esphome = (doc.esphome as Record<string, unknown>) ?? {};
  const wifiDoc = (doc.wifi as Record<string, unknown>) ?? {};
  const apiDoc = (doc.api as Record<string, unknown>) ?? {};
  const otaRaw = doc.ota;
  const otaArr = Array.isArray(otaRaw) ? otaRaw as Record<string, unknown>[] : (otaRaw ? [otaRaw as Record<string, unknown>] : []);
  const otaDoc = otaArr[0] ?? {};
  const mqttDoc = (doc.mqtt as Record<string, unknown>) ?? {};
  const loggerDoc = (doc.logger as Record<string, unknown>) ?? {};
  const webServerDoc = (doc.web_server as Record<string, unknown>) ?? {};
  const timeRaw = doc.time;
  const timeArr = Array.isArray(timeRaw) ? timeRaw as Record<string, unknown>[] : (timeRaw ? [timeRaw as Record<string, unknown>] : []);
  const timeDoc = timeArr[0] ?? {};
  const statusLedDoc = (doc.status_led as Record<string, unknown>) ?? {};
  const apDoc = (wifiDoc.ap as Record<string, unknown>) ?? {};
  const manualIp = (wifiDoc.manual_ip as Record<string, unknown>) ?? {};
  const apiEncryption = (apiDoc.encryption as Record<string, unknown>) ?? {};

  // Status LED pin can be a string or a { pin: ... } object
  let statusLedPin = '';
  if (statusLedDoc.pin) {
    if (typeof statusLedDoc.pin === 'object') {
      statusLedPin = strVal((statusLedDoc.pin as Record<string, unknown>).number ?? '');
    } else {
      statusLedPin = strVal(statusLedDoc.pin);
    }
  }

  const settings: ProjectSettings = {
    name: strVal(esphome.name),
    friendlyName: strVal(esphome.friendly_name),
    wifiSsid: isSecret(wifiDoc.ssid) ? '' : strVal(wifiDoc.ssid),
    wifiPassword: isSecret(wifiDoc.password) ? '' : strVal(wifiDoc.password),
    useSecretsWifi: isSecret(wifiDoc.ssid) || isSecret(wifiDoc.password),
    useSecretsApi: isSecret(apiEncryption.key),
    useSecretsOta: isSecret(otaDoc.password),
    useSecretsMqtt: isSecret(mqttDoc.username) || isSecret(mqttDoc.password),
    staticIpEnabled: !!manualIp.static_ip,
    staticIp: strVal(manualIp.static_ip),
    gateway: strVal(manualIp.gateway),
    subnet: strVal(manualIp.subnet, '255.255.255.0'),
    dns: strVal(manualIp.dns1),
    apiEnabled: doc.api !== undefined,
    apiKey: isSecret(apiEncryption.key) ? '' : strVal(apiEncryption.key),
    otaEnabled: doc.ota !== undefined,
    otaPassword: isSecret(otaDoc.password) ? '' : strVal(otaDoc.password),
    mqttEnabled: doc.mqtt !== undefined,
    mqttBroker: strVal(mqttDoc.broker),
    mqttPort: Number(mqttDoc.port ?? 1883),
    mqttUsername: isSecret(mqttDoc.username) ? '' : strVal(mqttDoc.username),
    mqttPassword: isSecret(mqttDoc.password) ? '' : strVal(mqttDoc.password),
    webServerEnabled: doc.web_server !== undefined,
    webServerPort: Number(webServerDoc.port ?? 80),
    loggerEnabled: doc.logger !== undefined,
    loggerLevel: strVal(loggerDoc.level, 'DEBUG'),
    captivePortalEnabled: doc.captive_portal !== undefined,
    fallbackApEnabled: !!apDoc.ssid,
    fallbackApSsid: strVal(apDoc.ssid),
    fallbackApPassword: strVal(apDoc.password),
    statusLedPin,
    timeEnabled: doc.time !== undefined,
    timeTimezone: strVal(timeDoc.timezone),
    timeServers: Array.isArray(timeDoc.servers)
      ? (timeDoc.servers as unknown[]).map(String).join(', ')
      : '',
  };

  // ── Components ───────────────────────────────────────────────
  const components: ComponentInstance[] = [];
  let idCounter = 0;

  for (const domain of COMPONENT_DOMAINS) {
    const raw = doc[domain];
    if (!raw) continue;
    const entries = Array.isArray(raw) ? raw : [raw];

    for (const entry of entries as Record<string, unknown>[]) {
      const platform = strVal(entry.platform);
      if (!platform) continue;

      const def = componentDefinitions.find((d) => d.domain === domain && d.platform === platform);
      if (!def) {
        warnings.push(`${domain}.${platform} is not supported in ESPForge and was skipped.`);
        continue;
      }

      idCounter++;
      const id = `imported_${idCounter}`;

      // Config: pull known fields from the entry
      const config: Record<string, unknown> = {};
      if (entry.name !== undefined) config.name = entry.name;
      for (const field of def.configFields) {
        if (field.key === 'name') continue; // already handled above
        if (entry[field.key] !== undefined) config[field.key] = entry[field.key];
      }

      // Pins
      const pins: Record<string, number | null> = {};
      const onlyPin = def.pins.length === 1;
      for (const pinReq of def.pins) {
        pins[pinReq.role] = extractPin(entry, pinReq.role, onlyPin);
      }

      components.push({
        id,
        type: def.type,
        name: strVal(entry.name, def.name),
        config,
        pins,
      });
    }
  }

  if (components.length === 0 && Object.values(COMPONENT_DOMAINS).some((d) => doc[d])) {
    warnings.push('No components could be matched. They may use platforms not yet supported by ESPForge.');
  }

  return {
    project: {
      board: board ?? undefined,
      settings,
      components,
      automations: [],
    },
    warnings,
  };
}
