import * as yaml from 'js-yaml';
import type { Project, ProjectSettings, ComponentInstance, Automation, AutomationAction } from '../types';
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

// ── Automation action parser ──
const SIMPLE_ACTION_TYPES = new Set([
  'switch.toggle', 'switch.turn_on', 'switch.turn_off',
  'light.toggle', 'light.turn_off',
  'fan.toggle', 'fan.turn_on', 'fan.turn_off',
  'cover.open', 'cover.close', 'cover.stop',
  'lock.lock', 'lock.unlock',
  'output.turn_on', 'output.turn_off',
]);

const _actCounter = { n: 0 };

function parseActionsList(rawThen: unknown): AutomationAction[] {
  if (!rawThen) return [];
  const arr = Array.isArray(rawThen) ? rawThen : [rawThen];
  const actions: AutomationAction[] = [];
  for (const raw of arr) {
    if (!raw || typeof raw !== 'object') continue;
    const act = raw as Record<string, unknown>;
    _actCounter.n++;
    const id = `imported_act_${_actCounter.n}`;
    for (const [key, val] of Object.entries(act)) {
      if (SIMPLE_ACTION_TYPES.has(key)) {
        actions.push({ id, type: key as AutomationAction['type'], config: { target: String(val) } });
        break;
      }
      if (key === 'light.turn_on') {
        const config: Record<string, unknown> = {};
        if (typeof val === 'string') { config.target = val; }
        else if (val && typeof val === 'object') {
          const vo = val as Record<string, unknown>;
          config.target = String(vo.id || '');
          if (vo.brightness != null) config.brightness = vo.brightness;
        }
        actions.push({ id, type: 'light.turn_on', config });
        break;
      }
      if (key === 'number.set') {
        const config: Record<string, unknown> = {};
        if (val && typeof val === 'object') {
          const vo = val as Record<string, unknown>;
          config.target = String(vo.id || '');
          if (vo.value != null) config.value = vo.value;
        }
        actions.push({ id, type: 'number.set', config });
        break;
      }
      if (key === 'delay') {
        actions.push({ id, type: 'delay', config: { delay: String(val) } });
        break;
      }
      if (key === 'logger.log') {
        actions.push({ id, type: 'logger.log', config: { message: String(val) } });
        break;
      }
      if (key === 'mqtt.publish') {
        const config: Record<string, unknown> = {};
        if (val && typeof val === 'object') {
          const vo = val as Record<string, unknown>;
          config.topic = String(vo.topic || '');
          config.payload = String(vo.payload || '');
        }
        actions.push({ id, type: 'mqtt.publish', config });
        break;
      }
    }
  }
  return actions;
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
    fallbackApSsid: isSecret(apDoc.ssid) ? '' : strVal(apDoc.ssid),
    fallbackApPassword: isSecret(apDoc.password) ? '' : strVal(apDoc.password),
    useSecretsFallbackApSsid: isSecret(apDoc.ssid),
    useSecretsFallbackApPassword: isSecret(apDoc.password),
    statusLedPin,
    timeEnabled: doc.time !== undefined,
    timeTimezone: strVal(timeDoc.timezone),
    timeServers: Array.isArray(timeDoc.servers)
      ? (timeDoc.servers as unknown[]).map(String).join(', ')
      : '',
    _rawTimeExtras: (() => {
      const extras: Record<string, unknown> = {};
      if (timeDoc.id) extras.id = timeDoc.id;
      if (timeDoc.on_time) extras.on_time = timeDoc.on_time;
      return Object.keys(extras).length > 0 ? extras : undefined;
    })(),
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
        // Unknown platform — preserved verbatim in passthroughYaml, skip visual import
        continue;
      }

      idCounter++;
      const id = `imported_${idCounter}`;

      // Config: pull known fields from the entry
      const config: Record<string, unknown> = {};
      if (entry.name !== undefined) config.name = entry.name;
      // Some components (e.g. output.ledc) use `id` in YAML instead of `name`
      if (config.name === undefined && entry.id !== undefined) config.name = entry.id;
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

      // light.monochromatic references an output by id rather than having a direct pin.
      // Resolve the referenced output entry to find its pin.
      if (def.type === 'light.monochromatic' && entry.output) {
        const outputRaw = doc.output;
        const outputEntries = Array.isArray(outputRaw)
          ? (outputRaw as Record<string, unknown>[])
          : outputRaw ? [outputRaw as Record<string, unknown>] : [];
        const referencedOutput = outputEntries.find((o) => o.id === entry.output);
        if (referencedOutput) {
          // Store original output id so generator references it instead of auto-generating one
          config._outputId = entry.output;
        }
      }

      // For all other components that reference outputs by id, store the ids.
      // The output components themselves carry the pins; these components just reference them.
      const outputRefFields: Record<string, { field: string; configKey: string }[]> = {
        'light.binary':  [{ field: 'output', configKey: '_outputId' }],
        'light.cwww':    [{ field: 'cold_white', configKey: '_outputId_cold_white' }, { field: 'warm_white', configKey: '_outputId_warm_white' }],
        'light.rgb':     [{ field: 'red', configKey: '_outputId_red' }, { field: 'green', configKey: '_outputId_green' }, { field: 'blue', configKey: '_outputId_blue' }],
        'light.rgbw':    [{ field: 'red', configKey: '_outputId_red' }, { field: 'green', configKey: '_outputId_green' }, { field: 'blue', configKey: '_outputId_blue' }, { field: 'white', configKey: '_outputId_white' }],
        'fan.speed':     [{ field: 'output', configKey: '_outputId' }],
        'fan.binary':    [{ field: 'output', configKey: '_outputId' }],
        'fan.hbridge':   [{ field: 'pin_a', configKey: '_outputId_pin_a' }, { field: 'pin_b', configKey: '_outputId_pin_b' }],
        'lock.gpio':     [{ field: 'output', configKey: '_outputId' }],
        'misc.servo':    [{ field: 'output', configKey: '_outputId' }],
        'media.rtttl':   [{ field: 'output', configKey: '_outputId' }],
      };
      if (def.type in outputRefFields) {
        for (const { field, configKey } of outputRefFields[def.type]) {
          if (entry[field] && typeof entry[field] === 'string') {
            config[configKey] = entry[field];
          }
        }
      }

      // Capture inverted flag from nested pin objects (e.g. pin: {number: GPIO4, inverted: true})
      if (def.pins.length === 1 && def.configFields.some((f) => f.key === 'inverted')) {
        const rawPin = entry[def.pins[0].role] ?? entry['pin'];
        if (rawPin && typeof rawPin === 'object' && !Array.isArray(rawPin)) {
          const pinObj = rawPin as Record<string, unknown>;
          if (pinObj.inverted === true && config.inverted === undefined) config.inverted = true;
        }
      }

      // Generic extra captures: id (separate from name), restore_mode, lambda, filters
      if (entry.id !== undefined && String(entry.id) !== String(config.name ?? '')) {
        config._yamlId = entry.id;
      }
      if (entry.restore_mode !== undefined && config.restore_mode === undefined) {
        config.restore_mode = entry.restore_mode;
      }
      if (entry.lambda !== undefined) config._lambda = entry.lambda;
      if (entry.filters !== undefined) config._filters = entry.filters;

      // Capture inline action blocks (on_press, on_state, on_value, etc.) so the
      // generator can re-attach them and the original behaviour is preserved.
      const inlineActions: Record<string, unknown> = {};
      for (const key of Object.keys(entry)) {
        if (key.startsWith('on_')) inlineActions[key] = entry[key];
      }
      if (Object.keys(inlineActions).length > 0) config._inlineActions = inlineActions;

      components.push({
        id,
        type: def.type,
        name: strVal(entry.name, def.name),
        config,
        pins,
      });
    }
  }

  // ── Automations ──────────────────────────────────────────────
  const automations: Automation[] = [];
  let autoCounter = 0;

  // interval: automations
  const intervalRaw = doc.interval;
  if (intervalRaw) {
    const intervalArr = Array.isArray(intervalRaw) ? intervalRaw : [intervalRaw];
    for (const entry of intervalArr as Record<string, unknown>[]) {
      autoCounter++;
      automations.push({
        id: `imported_auto_${autoCounter}`,
        name: `Interval (${strVal(entry.interval, '60s')})`,
        trigger: { type: 'time_interval', config: { interval: strVal(entry.interval, '60s') } },
        conditions: [],
        actions: parseActionsList(entry.then),
      });
    }
  }

  // esphome.on_boot
  const onBootRaw = (esphome as Record<string, unknown>).on_boot;
  if (onBootRaw) {
    // Array form: [{priority: -100, then: [...]}, ...] — complex, can't safely round-trip
    // Simple form: {then: [...]} — parse into automation
    const isArray = Array.isArray(onBootRaw);
    const bootObj = !isArray ? onBootRaw as Record<string, unknown> : null;
    const hasThen = bootObj && Array.isArray(bootObj.then);
    if (!isArray && hasThen) {
      autoCounter++;
      automations.push({
        id: `imported_auto_${autoCounter}`,
        name: 'On Boot',
        trigger: { type: 'on_boot', config: {} },
        conditions: [],
        actions: parseActionsList(bootObj!.then),
      });
    } else {
      // Complex form — store verbatim so the generator can re-attach it unchanged
      settings._rawOnBoot = onBootRaw;
    }
  }

  return {
    project: {
      board: board ?? undefined,
      settings,
      components,
      automations,
      // Store the full original YAML — the generator will strip sections it regenerates
      passthroughYaml: text,
    },
    warnings,
  };
}
