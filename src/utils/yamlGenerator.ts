import * as yaml from 'js-yaml';
import type { Project, ComponentInstance } from '../types';
import { getDefinition } from '../data/components';

export function generateYaml(project: Project): string {
  if (!project.board) return '# Select a board to get started\n';

  const doc: Record<string, unknown> = {};
  const { settings, board, components, automations } = project;

  // ── esphome ──
  doc.esphome = {
    name: settings.name,
    friendly_name: settings.friendlyName,
  };

  // ── platform ──
  if (board.platform === 'esp32') {
    doc.esp32 = {
      board: board.board,
      framework: { type: 'arduino' },
    };
  } else {
    doc.esp8266 = {
      board: board.board,
      framework: { type: 'arduino' },
    };
  }

  // ── logger ──
  if (settings.loggerEnabled) {
    if (settings.loggerLevel && settings.loggerLevel !== 'DEBUG') {
      doc.logger = { level: settings.loggerLevel };
    } else {
      doc.logger = null;
    }
  }

  // ── api ──
  if (settings.apiEnabled) {
    const api: Record<string, unknown> = {};
    if (settings.useSecretsApi) {
      api.encryption = { key: '__SECRET__api_key' };
    } else if (settings.apiKey) {
      api.encryption = { key: settings.apiKey };
    }
    doc.api = Object.keys(api).length > 0 ? api : null;
  }

  // ── ota ──
  if (settings.otaEnabled) {
    const ota: Record<string, unknown> = { platform: 'esphome' };
    if (settings.useSecretsOta) {
      ota.password = '__SECRET__ota_password';
    } else if (settings.otaPassword) {
      ota.password = settings.otaPassword;
    }
    doc.ota = [ota];
  }

  // ── wifi ──
  {
    const wifi: Record<string, unknown> = {};
    if (settings.useSecretsWifi) {
      wifi.ssid = '__SECRET__wifi_ssid';
      wifi.password = '__SECRET__wifi_password';
    } else {
      if (settings.wifiSsid) wifi.ssid = settings.wifiSsid;
      if (settings.wifiPassword) wifi.password = settings.wifiPassword;
    }

    if (settings.staticIpEnabled && settings.staticIp) {
      wifi.manual_ip = {
        static_ip: settings.staticIp,
        gateway: settings.gateway || '192.168.1.1',
        subnet: settings.subnet || '255.255.255.0',
        ...(settings.dns ? { dns1: settings.dns } : {}),
      };
    }

    if (settings.fallbackApEnabled) {
      wifi.ap = {
        ssid: settings.fallbackApSsid || `${settings.friendlyName} Fallback`,
        password: settings.fallbackApPassword || 'fallback123',
      };
    }
    doc.wifi = wifi;
  }

  // ── captive_portal ──
  if (settings.captivePortalEnabled && settings.fallbackApEnabled) {
    doc.captive_portal = null;
  }

  // ── web_server ──
  if (settings.webServerEnabled) {
    doc.web_server = { port: settings.webServerPort };
  }

  // ── mqtt ──
  if (settings.mqttEnabled) {
    const mqtt: Record<string, unknown> = {};
    if (settings.mqttBroker) mqtt.broker = settings.mqttBroker;
    if (settings.mqttPort !== 1883) mqtt.port = settings.mqttPort;
    if (settings.useSecretsMqtt) {
      mqtt.username = '__SECRET__mqtt_username';
      mqtt.password = '__SECRET__mqtt_password';
    } else {
      if (settings.mqttUsername) mqtt.username = settings.mqttUsername;
      if (settings.mqttPassword) mqtt.password = settings.mqttPassword;
    }
    doc.mqtt = mqtt;
  }

  // ── spi ──
  const needsSPI = components.some((c) => {
    const def = getDefinition(c.type);
    return def?.needsSPI;
  });
  if (needsSPI) {
    const spiDefaults = board.platform === 'esp8266'
      ? { clk_pin: 'GPIO14', mosi_pin: 'GPIO13', miso_pin: 'GPIO12' }
      : { clk_pin: 'GPIO18', mosi_pin: 'GPIO23', miso_pin: 'GPIO19' };
    doc.spi = spiDefaults;
  }

  // ── i2c ──
  const needsI2C = components.some((c) => {
    const def = getDefinition(c.type);
    return def?.needsI2C;
  });
  if (needsI2C && board.defaultI2C) {
    doc.i2c = {
      sda: `GPIO${board.defaultI2C.sda}`,
      scl: `GPIO${board.defaultI2C.scl}`,
      scan: true,
    };
  }

  // ── one_wire ──
  const dallasComponents = components.filter((c) => c.type === 'sensor.dallas');
  if (dallasComponents.length > 0) {
    const owPins = new Set<string>();
    for (const c of dallasComponents) {
      if (c.pins.pin != null) owPins.add(`GPIO${c.pins.pin}`);
    }
    doc.one_wire = Array.from(owPins).map((pin) => ({ platform: 'gpio', pin }));
  }

  // ── esp32_ble_tracker ──
  const hasBleTracker = components.some((c) => c.type === 'bluetooth.tracker');
  const hasBleProxy = components.some((c) => c.type === 'bluetooth.proxy');
  const hasBleRssi = components.some((c) => c.type === 'sensor.ble_rssi');
  const hasBlePresence = components.some((c) => c.type === 'binary_sensor.ble_presence');
  const hasXiaomiBle = components.some((c) => c.type === 'sensor.xiaomi_ble');
  if (hasBleTracker || hasBleProxy || hasBleRssi || hasBlePresence || hasXiaomiBle) {
    const tracker: Record<string, unknown> = {};
    const trackerInst = components.find((c) => c.type === 'bluetooth.tracker');
    if (trackerInst) {
      if (trackerInst.config.scan_parameters_active !== undefined) {
        tracker.scan_parameters = {
          active: trackerInst.config.scan_parameters_active,
          interval: trackerInst.config.scan_parameters_interval || '1100ms',
          window: trackerInst.config.scan_parameters_window || '1100ms',
        };
      }
    }
    doc.esp32_ble_tracker = Object.keys(tracker).length > 0 ? tracker : null;
  }

  // ── bluetooth_proxy ──
  if (hasBleProxy) {
    const proxyInst = components.find((c) => c.type === 'bluetooth.proxy');
    const proxy: Record<string, unknown> = {};
    if (proxyInst) {
      proxy.active = proxyInst.config.active !== false;
    }
    doc.bluetooth_proxy = proxy;
  }

  // ── remote_transmitter (from ir.transmitter AND climate.ir) ──
  const irTransmitters = components.filter((c) => c.type === 'ir.transmitter');
  const climateIrComponents = components.filter((c) => c.type === 'climate.ir');
  const allTransmitterEntries: Record<string, unknown>[] = [];
  for (const inst of irTransmitters) {
    const entry: Record<string, unknown> = {};
    if (inst.pins.pin != null) entry.pin = `GPIO${inst.pins.pin}`;
    entry.carrier_duty_percent = Number(inst.config.carrier_duty_percent) || 50;
    entry.id = inst.id;
    allTransmitterEntries.push(entry);
  }
  for (const inst of climateIrComponents) {
    // Only add if no standalone ir.transmitter already covers this pin
    if (inst.pins.pin != null) {
      const alreadyCovered = irTransmitters.some((t) => t.pins.pin === inst.pins.pin);
      if (!alreadyCovered) {
        allTransmitterEntries.push({
          pin: `GPIO${inst.pins.pin}`,
          carrier_duty_percent: 50,
          id: `${inst.id}_transmitter`,
        });
      }
    }
  }
  if (allTransmitterEntries.length > 0) {
    doc.remote_transmitter = allTransmitterEntries;
  }

  // ── remote_receiver ──
  const irReceivers = components.filter((c) => c.type === 'ir.receiver');
  if (irReceivers.length > 0) {
    doc.remote_receiver = irReceivers.map((inst) => {
      const entry: Record<string, unknown> = {};
      if (inst.pins.pin != null) {
        entry.pin = { number: `GPIO${inst.pins.pin}`, inverted: true };
      }
      entry.dump = inst.config.dump || 'all';
      if (inst.config.tolerance) entry.tolerance = `${inst.config.tolerance}%`;
      entry.id = inst.id;
      return entry;
    });
  }

  // ── uart (for PZEM, DFPlayer, etc.) ──
  const uartComponents = components.filter((c) => {
    const def = getDefinition(c.type);
    return def?.extraDomains?.includes('uart');
  });
  const mmwaveBaud: Record<string, number> = {
    'sensor.ld2410': 256000,
    'sensor.ld2450': 256000,
    'sensor.ld2411s': 256000,
  };
  if (uartComponents.length > 0) {
    doc.uart = uartComponents.map((inst) => {
      const entry: Record<string, unknown> = {};
      if (inst.pins.tx_pin != null) entry.tx_pin = `GPIO${inst.pins.tx_pin}`;
      if (inst.pins.rx_pin != null) entry.rx_pin = `GPIO${inst.pins.rx_pin}`;
      const baud = mmwaveBaud[inst.type] ?? 9600;
      entry.baud_rate = baud;
      if (baud === 256000) {
        entry.parity = 'NONE';
        entry.stop_bits = 1;
      }
      entry.id = `${inst.id}_uart`;
      return entry;
    });
  }

  // ── i2s_audio ──
  const i2sComponents = components.filter((c) => c.type === 'media.i2s_audio');
  if (i2sComponents.length > 0) {
    doc.i2s_audio = i2sComponents.map((inst) => {
      const entry: Record<string, unknown> = {};
      entry.id = inst.config.id || 'i2s_out';
      if (inst.pins.bclk_pin != null) entry.i2s_bclk_pin = `GPIO${inst.pins.bclk_pin}`;
      if (inst.pins.ws_pin != null) entry.i2s_lrclk_pin = `GPIO${inst.pins.ws_pin}`;
      return entry;
    });
  }

  // ── deep_sleep ──
  const deepSleepInst = components.find((c) => c.type === 'misc.deep_sleep');
  if (deepSleepInst) {
    doc.deep_sleep = {
      run_duration: deepSleepInst.config.run_duration || '30s',
      sleep_duration: deepSleepInst.config.sleep_duration || '5min',
    };
  }

  // ── dfplayer ──
  const dfplayerInst = components.find((c) => c.type === 'media.dfplayer');
  if (dfplayerInst) {
    doc.dfplayer = { uart_id: `${dfplayerInst.id}_uart` };
  }

  // ── rtttl ──
  const rtttlInst = components.find((c) => c.type === 'media.rtttl');
  if (rtttlInst) {
    doc.rtttl = { output: `${rtttlInst.id}_output` };
  }

  // ── status_led ──
  if (settings.statusLedPin) {
    doc.status_led = { pin: settings.statusLedPin };
  }

  // ── time (SNTP) ──
  if (settings.timeEnabled) {
    const time: Record<string, unknown> = { platform: 'sntp' };
    if (settings.timeTimezone) time.timezone = settings.timeTimezone;
    if (settings.timeServers) {
      time.servers = settings.timeServers.split(',').map((s) => s.trim()).filter(Boolean);
    }
    doc.time = [time];
  }

  // ── esp32_touch (top-level setup) ──
  const hasTouch = components.some((c) => c.type === 'binary_sensor.esp32_touch');
  if (hasTouch) {
    doc.esp32_touch = null;
  }

  // ── ld2410 (top-level section) ──
  const ld2410Inst = components.find((c) => c.type === 'sensor.ld2410');
  if (ld2410Inst) {
    const ld2410Hub: Record<string, unknown> = { uart_id: `${ld2410Inst.id}_uart` };
    if (ld2410Inst.config.max_move_distance != null) ld2410Hub.max_move_distance_gate = Number(ld2410Inst.config.max_move_distance);
    if (ld2410Inst.config.max_still_distance != null) ld2410Hub.max_still_distance_gate = Number(ld2410Inst.config.max_still_distance);
    if (ld2410Inst.config.timeout != null) ld2410Hub.timeout = Number(ld2410Inst.config.timeout);
    doc.ld2410 = ld2410Hub;
  }

  // ── ld2450 (top-level section) ──
  const ld2450Inst = components.find((c) => c.type === 'sensor.ld2450');
  if (ld2450Inst) {
    const ld2450Hub: Record<string, unknown> = { id: `${ld2450Inst.id}_hub`, uart_id: `${ld2450Inst.id}_uart` };
    if (ld2450Inst.config.fast_off_detection) ld2450Hub.fast_off_detection = true;
    doc.ld2450 = ld2450Hub;
  }

  // ── ads1115 (top-level hub) ──
  const ads1115Components = components.filter((c) => c.type === 'sensor.ads1115');
  if (ads1115Components.length > 0) {
    const hubs = new Map<string, Record<string, unknown>>();
    for (const inst of ads1115Components) {
      const addr = (inst.config.address as string) || '0x48';
      if (!hubs.has(addr)) {
        hubs.set(addr, { address: addr, id: inst.id + '_hub' });
      }
    }
    doc.ads1115 = Array.from(hubs.values());
  }

  // ── pcf8574 ──
  const pcf8574Components = components.filter((c) => c.type === 'misc.pcf8574');
  if (pcf8574Components.length > 0) {
    doc.pcf8574 = pcf8574Components.map((inst) => {
      const entry: Record<string, unknown> = {};
      entry.id = inst.config.id || inst.id;
      if (inst.config.address) entry.address = inst.config.address;
      if (inst.config.pcf8575) entry.pcf8575 = true;
      return entry;
    });
  }

  // ── Group components by domain ──
  const domainMap = new Map<string, unknown[]>();

  for (const inst of components) {
    const def = getDefinition(inst.type);
    if (!def) continue;

    const entry = generateComponentEntry(inst, def.type, project);
    if (!entry) continue;

    const domain = def.domain;
    if (!domainMap.has(domain)) domainMap.set(domain, []);
    domainMap.get(domain)!.push(entry);
  }

  // Add extra output entries for lights that need them
  for (const inst of components) {
    const def = getDefinition(inst.type);
    if (!def || !def.extraDomains?.includes('output')) continue;

    const outputEntry = generateOutputForLight(inst, project);
    if (outputEntry) {
      if (!domainMap.has('output')) domainMap.set('output', []);
      const outputs = domainMap.get('output')!;
      if (Array.isArray(outputEntry) && !('platform' in outputEntry)) {
        outputs.push(...(outputEntry as Record<string, unknown>[]));
      } else {
        outputs.push(outputEntry as Record<string, unknown>);
      }
    }
  }

  // Add LD2410 binary sensor entries
  for (const inst of components) {
    if (inst.type !== 'sensor.ld2410') continue;
    const bsEntry: Record<string, unknown> = { platform: 'ld2410' };
    const baseName = str(inst.config.name as string, inst.name);
    const presenceName = (inst.config.presence_name as string) || baseName + ' Presence';
    const movingTargetName = inst.config.moving_target_name as string | undefined;
    const stillTargetName = inst.config.still_target_name as string | undefined;
    bsEntry.has_target = { name: presenceName };
    if (movingTargetName) bsEntry.has_moving_target = { name: movingTargetName };
    if (stillTargetName) bsEntry.has_still_target = { name: stillTargetName };
    if (!domainMap.has('binary_sensor')) domainMap.set('binary_sensor', []);
    domainMap.get('binary_sensor')!.push(bsEntry);
  }

  // Add LD2450 binary sensor entries
  for (const inst of components) {
    if (inst.type !== 'sensor.ld2450') continue;
    const bsEntry: Record<string, unknown> = { platform: 'ld2450', ld2450_id: `${inst.id}_hub` };
    const presenceName = (inst.config.presence_name as string) || 'Presence';
    bsEntry.has_target = { name: presenceName };
    bsEntry.has_moving_target = { name: 'Moving Target' };
    bsEntry.has_still_target = { name: 'Still Target' };
    if (!domainMap.has('binary_sensor')) domainMap.set('binary_sensor', []);
    domainMap.get('binary_sensor')!.push(bsEntry);
  }

  // Embed value_range automations into sensor entries
  const valueRangeAutos = automations.filter((a) => a.trigger.type === 'value_range' && a.trigger.componentId);
  if (valueRangeAutos.length > 0 && domainMap.has('sensor')) {
    const sensorEntries = domainMap.get('sensor')! as Record<string, unknown>[];
    for (const auto of valueRangeAutos) {
      const targetInst = components.find((c) => c.id === auto.trigger.componentId);
      if (!targetInst) continue;
      // Find the matching sensor entry by name
      const sensorEntry = sensorEntries.find(
        (e) => e.name === str(targetInst.config.name as string, targetInst.name),
      );
      if (!sensorEntry) continue;
      const rangeConfig: Record<string, unknown> = {};
      const dir = auto.trigger.config.direction || 'above';
      if (dir === 'above' && auto.trigger.config.threshold != null) {
        rangeConfig.above = Number(auto.trigger.config.threshold);
      } else if (dir === 'below' && auto.trigger.config.threshold != null) {
        rangeConfig.below = Number(auto.trigger.config.threshold);
      } else if (dir === 'between') {
        if (auto.trigger.config.threshold != null) rangeConfig.above = Number(auto.trigger.config.threshold);
        if (auto.trigger.config.threshold_upper != null) rangeConfig.below = Number(auto.trigger.config.threshold_upper);
      }
      rangeConfig.then = auto.actions.map((act) => formatAction(act, project));
      if (!sensorEntry.on_value_range) sensorEntry.on_value_range = [];
      (sensorEntry.on_value_range as unknown[]).push(rangeConfig);
    }
  }

  for (const [domain, entries] of domainMap) {
    doc[domain] = entries;
  }

  // ── Standalone automations (interval / on_boot) ──
  const standaloneAutomations = automations.filter(
    (a) => a.trigger.type === 'time_interval' || a.trigger.type === 'on_boot',
  );

  const intervalAutos = standaloneAutomations.filter((a) => a.trigger.type === 'time_interval');
  if (intervalAutos.length > 0) {
    doc.interval = intervalAutos.map((a) => ({
      interval: (a.trigger.config.interval as string) || '60s',
      then: a.actions.map((act) => formatAction(act, project)),
    }));
  }

  // on_boot goes inside esphome
  const bootAutos = standaloneAutomations.filter((a) => a.trigger.type === 'on_boot');
  if (bootAutos.length > 0) {
    (doc.esphome as Record<string, unknown>).on_boot = {
      then: bootAutos.flatMap((a) => a.actions.map((act) => formatAction(act, project))),
    };
  }

  // Serialize each section separately with comments for readability
  const sectionOrder = [
    'esphome',
    board.platform === 'esp32' ? 'esp32' : 'esp8266',
    'logger', 'api', 'ota', 'wifi', 'captive_portal', 'web_server', 'mqtt',
    'time', 'status_led',
    'i2c', 'one_wire', 'uart', 'spi',
    'esp32_ble_tracker', 'bluetooth_proxy', 'esp32_touch',
    'remote_transmitter', 'remote_receiver', 'i2s_audio',
    'deep_sleep', 'dfplayer', 'rtttl',
    'ld2410', 'ads1115', 'pcf8574',
  ];

  const sectionComments: Record<string, string> = {
    esphome: '# Device configuration',
    esp32: '# ESP32 board settings',
    esp8266: '# ESP8266 board settings',
    logger: '# Enable logging',
    api: '# Home Assistant API',
    ota: '# Over-the-Air updates',
    wifi: '# WiFi configuration',
    captive_portal: '# Captive portal (for WiFi setup fallback)',
    web_server: '# Built-in web server',
    mqtt: '# MQTT broker',
    i2c: '# I²C bus',
    one_wire: '# OneWire bus',
    uart: '# UART bus',
    esp32_ble_tracker: '# BLE scanner',
    bluetooth_proxy: '# Bluetooth proxy for Home Assistant',
    remote_transmitter: '# IR transmitter',
    remote_receiver: '# IR receiver',
    i2s_audio: '# I²S audio bus',
    deep_sleep: '# Deep sleep',
    dfplayer: '# DFPlayer MP3 module',
    rtttl: '# Buzzer / RTTTL',
    interval: '# Interval automations',
    time: '# Time (SNTP)',
    status_led: '# Status LED',
    esp32_touch: '# ESP32 capacitive touch',
    ld2410: '# LD2410 mmWave radar',
    ads1115: '# ADS1115 ADC',
    pcf8574: '# PCF8574 I/O expander',
  };

  const domainComments: Record<string, string> = {
    sensor: '# Sensors',
    binary_sensor: '# Binary sensors',
    switch: '# Switches',
    button: '# Buttons',
    light: '# Lights',
    fan: '# Fans',
    cover: '# Covers / Blinds',
    lock: '# Locks',
    number: '# Number inputs',
    select: '# Select inputs',
    text: '# Text inputs',
    output: '# Outputs',
    display: '# Displays',
    climate: '# Climate / HVAC',
    speaker: '# Speaker',
    microphone: '# Microphone',
    servo: '# Servo motors',
    stepper: '# Stepper motors',
    text_sensor: '# Text sensors',
  };

  const dumpSection = (key: string, value: unknown): string => {
    return yaml.dump({ [key]: value }, {
      lineWidth: -1,
      noRefs: true,
      quotingType: '"',
      forceQuotes: false,
      skipInvalid: true,
      sortKeys: false,
    })
      .replace(/: null$/gm, ':')
      .replace(/: ['"]?__SECRET__(\S+?)['"]?$/gm, ': !secret $1');
  };

  const parts: string[] = [];

  // Known top-level sections first
  for (const key of sectionOrder) {
    if (doc[key] === undefined) continue;
    const comment = sectionComments[key];
    if (comment) parts.push(comment);
    parts.push(dumpSection(key, doc[key]));
    delete doc[key];
  }

  // Domain-grouped component sections
  for (const [domain, entries] of domainMap) {
    if (doc[domain] === undefined) continue;
    const comment = domainComments[domain] || `# ${domain.charAt(0).toUpperCase() + domain.slice(1)}`;
    parts.push(comment);
    parts.push(dumpSection(domain, entries));
    delete doc[domain];
  }

  // Any remaining sections (interval, etc.)
  for (const [key, value] of Object.entries(doc)) {
    const comment = sectionComments[key] || domainComments[key];
    if (comment) parts.push(comment);
    parts.push(dumpSection(key, value));
  }

  // ── Passthrough: sections from imported YAML that ESPForge doesn't manage ──
  if (project.passthroughYaml) {
    try {
      const preprocessed = project.passthroughYaml.replace(/:\s*!secret\s+(\S+)/g, ': "__SECRET__$1"');
      const passDoc = yaml.load(preprocessed) as Record<string, unknown>;
      if (passDoc && typeof passDoc === 'object' && !Array.isArray(passDoc)) {
        // Remove every key ESPForge already emitted above
        const emittedKeys = new Set([
          'esphome',
          board.platform === 'esp32' ? 'esp32' : 'esp8266',
          'logger', 'api', 'ota', 'wifi', 'captive_portal', 'web_server', 'mqtt',
          'spi', 'i2c', 'one_wire', 'uart',
          'esp32_ble_tracker', 'bluetooth_proxy', 'esp32_touch',
          'remote_transmitter', 'remote_receiver', 'i2s_audio',
          'deep_sleep', 'dfplayer', 'rtttl', 'status_led', 'time',
          'ld2410', 'ads1115', 'pcf8574', 'interval',
          ...Array.from(domainMap.keys()),
        ]);
        const passthroughParts: string[] = [];
        for (const [key, value] of Object.entries(passDoc)) {
          if (emittedKeys.has(key)) continue;
          passthroughParts.push(dumpSection(key, value));
        }
        if (passthroughParts.length > 0) {
          parts.push('# (Passthrough — sections preserved from original YAML)');
          parts.push(...passthroughParts);
        }
      }
    } catch {
      // Malformed passthrough — skip silently
    }
  }

  return parts.join('\n');
}

// ── Per-component YAML entry ──

function generateComponentEntry(
  inst: ComponentInstance,
  type: string,
  project: Project,
): Record<string, unknown> | null {
  const base: Record<string, unknown> = {};

  switch (type) {
    case 'sensor.dht': {
      base.platform = 'dht';
      base.model = inst.config.model || 'DHT22';
      if (inst.pins.pin != null) base.pin = `GPIO${inst.pins.pin}`;
      base.temperature = { name: str(inst.config.temperature_name, 'Temperature') };
      base.humidity = { name: str(inst.config.humidity_name, 'Humidity') };
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'sensor.dallas': {
      base.platform = 'dallas_temp';
      if (inst.config.address) base.address = inst.config.address;
      base.name = str(inst.config.name, inst.name);
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'sensor.adc': {
      base.platform = 'adc';
      if (inst.pins.pin != null) base.pin = `GPIO${inst.pins.pin}`;
      base.name = str(inst.config.name, inst.name);
      if (inst.config.attenuation && inst.config.attenuation !== 'auto') {
        base.attenuation = inst.config.attenuation;
      }
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'sensor.bme280': {
      base.platform = 'bme280';
      if (inst.config.address) base.address = inst.config.address;
      base.temperature = { name: str(inst.config.temperature_name, 'Temperature') };
      base.humidity = { name: str(inst.config.humidity_name, 'Humidity') };
      base.pressure = { name: str(inst.config.pressure_name, 'Pressure') };
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'sensor.bmp280': {
      base.platform = 'bmp280';
      if (inst.config.address) base.address = inst.config.address;
      base.temperature = { name: str(inst.config.temperature_name, 'Temperature') };
      base.pressure = { name: str(inst.config.pressure_name, 'Pressure') };
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'sensor.ultrasonic': {
      base.platform = 'ultrasonic';
      if (inst.pins.trigger_pin != null) base.trigger_pin = `GPIO${inst.pins.trigger_pin}`;
      if (inst.pins.echo_pin != null) base.echo_pin = `GPIO${inst.pins.echo_pin}`;
      base.name = str(inst.config.name, inst.name);
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'sensor.bh1750': {
      base.platform = 'bh1750';
      base.name = str(inst.config.name, inst.name);
      if (inst.config.address) base.address = inst.config.address;
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'binary_sensor.gpio': {
      base.platform = 'gpio';
      const pin: Record<string, unknown> = {};
      if (inst.pins.pin != null) pin.number = `GPIO${inst.pins.pin}`;
      const mode: Record<string, boolean> = { input: true };
      if (inst.config.pullup) mode.pullup = true;
      pin.mode = mode;
      if (inst.config.inverted) pin.inverted = true;
      base.pin = pin;
      base.name = str(inst.config.name, inst.name);
      if (inst.config.device_class) base.device_class = inst.config.device_class;

      // Embed component-attached automations
      const attachedAutomations = project.automations.filter(
        (a) => a.trigger.type === 'component_state' && a.trigger.componentId === inst.id,
      );
      for (const auto of attachedAutomations) {
        const event = auto.trigger.event || 'on_press';
        base[event] = {
          then: auto.actions.map((act) => formatAction(act, project)),
        };
      }
      break;
    }
    case 'binary_sensor.status': {
      base.platform = 'status';
      base.name = str(inst.config.name, inst.name);
      break;
    }
    case 'switch.gpio': {
      base.platform = 'gpio';
      if (inst.pins.pin != null) {
        const pin: Record<string, unknown> = { number: `GPIO${inst.pins.pin}` };
        if (inst.config.inverted) pin.inverted = true;
        base.pin = pin;
      }
      base.name = str(inst.config.name, inst.name);
      base.id = inst.id;
      if (inst.config.restore_mode) base.restore_mode = inst.config.restore_mode;
      break;
    }
    case 'switch.restart': {
      base.platform = 'restart';
      base.name = str(inst.config.name, inst.name);
      break;
    }
    case 'light.binary': {
      base.platform = 'binary';
      base.name = str(inst.config.name, inst.name);
      base.output = `${inst.id}_output`;
      break;
    }
    case 'light.monochromatic': {
      base.platform = 'monochromatic';
      base.name = str(inst.config.name, inst.name);
      base.output = `${inst.id}_output`;
      break;
    }
    case 'light.neopixelbus': {
      base.platform = 'neopixelbus';
      base.name = str(inst.config.name, inst.name);
      base.type = inst.config.type || 'GRB';
      base.variant = inst.config.variant || 'WS2812X';
      if (inst.pins.pin != null) base.pin = `GPIO${inst.pins.pin}`;
      base.num_leds = Number(inst.config.num_leds) || 30;
      if (inst.config.method) base.method = { type: inst.config.method };
      break;
    }
    case 'output.gpio': {
      base.platform = 'gpio';
      if (inst.pins.pin != null) base.pin = `GPIO${inst.pins.pin}`;
      base.id = inst.id;
      if (inst.config.inverted) base.inverted = true;
      break;
    }
    case 'output.ledc': {
      base.platform = 'ledc';
      if (inst.pins.pin != null) base.pin = `GPIO${inst.pins.pin}`;
      base.id = inst.id;
      if (inst.config.frequency) base.frequency = inst.config.frequency;
      break;
    }
    case 'display.ssd1306_i2c': {
      base.platform = 'ssd1306_i2c';
      base.model = inst.config.model || 'SSD1306_128X64';
      if (inst.config.address) base.address = inst.config.address;
      break;
    }
    case 'display.ssd1306_spi': {
      base.platform = 'ssd1306_spi';
      base.model = inst.config.model || 'SSD1306_128X64';
      if (inst.pins.cs_pin != null) base.cs_pin = `GPIO${inst.pins.cs_pin}`;
      if (inst.pins.dc_pin != null) base.dc_pin = `GPIO${inst.pins.dc_pin}`;
      if (inst.pins.reset_pin != null) base.reset_pin = `GPIO${inst.pins.reset_pin}`;
      break;
    }
    case 'display.st7789v': {
      base.platform = 'st7789v';
      if (inst.config.model) base.model = inst.config.model;
      if (inst.pins.cs_pin != null) base.cs_pin = `GPIO${inst.pins.cs_pin}`;
      if (inst.pins.dc_pin != null) base.dc_pin = `GPIO${inst.pins.dc_pin}`;
      if (inst.pins.reset_pin != null) base.reset_pin = `GPIO${inst.pins.reset_pin}`;
      if (inst.pins.backlight_pin != null) base.backlight_pin = `GPIO${inst.pins.backlight_pin}`;
      if (inst.config.width) base.width = Number(inst.config.width);
      if (inst.config.height) base.height = Number(inst.config.height);
      break;
    }
    // ── Env sensors ──
    case 'sensor.bme680': {
      base.platform = 'bme680';
      if (inst.config.address) base.address = inst.config.address;
      base.temperature = { name: str(inst.config.temperature_name, 'Temperature') };
      base.humidity = { name: str(inst.config.humidity_name, 'Humidity') };
      base.pressure = { name: str(inst.config.pressure_name, 'Pressure') };
      base.gas_resistance = { name: str(inst.config.gas_resistance_name, 'Gas Resistance') };
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'sensor.sht3xd': {
      base.platform = 'sht3xd';
      if (inst.config.address) base.address = inst.config.address;
      base.temperature = { name: str(inst.config.temperature_name, 'Temperature') };
      base.humidity = { name: str(inst.config.humidity_name, 'Humidity') };
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'sensor.aht10': {
      base.platform = 'aht10';
      if (inst.config.variant) base.variant = inst.config.variant;
      base.temperature = { name: str(inst.config.temperature_name, 'Temperature') };
      base.humidity = { name: str(inst.config.humidity_name, 'Humidity') };
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'sensor.tsl2561': {
      base.platform = 'tsl2561';
      base.name = str(inst.config.name, inst.name);
      if (inst.config.address) base.address = inst.config.address;
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'sensor.hx711': {
      base.platform = 'hx711';
      base.name = str(inst.config.name, inst.name);
      if (inst.pins.dout_pin != null) base.dout_pin = `GPIO${inst.pins.dout_pin}`;
      if (inst.pins.clk_pin != null) base.clk_pin = `GPIO${inst.pins.clk_pin}`;
      if (inst.config.gain) base.gain = Number(inst.config.gain);
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'sensor.mpu6050': {
      base.platform = 'mpu6050';
      if (inst.config.address) base.address = inst.config.address;
      base.accel_x = { name: str(inst.config.name, inst.name) + ' Accel X' };
      base.accel_y = { name: str(inst.config.name, inst.name) + ' Accel Y' };
      base.accel_z = { name: str(inst.config.name, inst.name) + ' Accel Z' };
      base.gyro_x = { name: str(inst.config.name, inst.name) + ' Gyro X' };
      base.gyro_y = { name: str(inst.config.name, inst.name) + ' Gyro Y' };
      base.gyro_z = { name: str(inst.config.name, inst.name) + ' Gyro Z' };
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'sensor.ina219': {
      base.platform = 'ina219';
      base.name = str(inst.config.name, inst.name);
      if (inst.config.address) base.address = inst.config.address;
      if (inst.config.shunt_resistance) base.shunt_resistance = inst.config.shunt_resistance + ' ohm';
      if (inst.config.max_current) base.max_current = inst.config.max_current + 'A';
      base.current = { name: str(inst.config.name, inst.name) + ' Current' };
      base.bus_voltage = { name: str(inst.config.name, inst.name) + ' Bus Voltage' };
      base.power = { name: str(inst.config.name, inst.name) + ' Power' };
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'sensor.ccs811': {
      base.platform = 'ccs811';
      if (inst.config.address) base.address = inst.config.address;
      base.eco2 = { name: str(inst.config.eco2_name, 'eCO2') };
      base.tvoc = { name: str(inst.config.tvoc_name, 'TVOC') };
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'sensor.scd30': {
      base.platform = 'scd30';
      base.co2 = { name: str(inst.config.co2_name, 'CO2') };
      base.temperature = { name: str(inst.config.temperature_name, 'Temperature') };
      base.humidity = { name: str(inst.config.humidity_name, 'Humidity') };
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'sensor.pzem004t': {
      base.platform = 'pzemac';
      base.uart_id = `${inst.id}_uart`;
      base.current = { name: str(inst.config.name, inst.name) + ' Current' };
      base.voltage = { name: str(inst.config.name, inst.name) + ' Voltage' };
      base.power = { name: str(inst.config.name, inst.name) + ' Power' };
      base.energy = { name: str(inst.config.name, inst.name) + ' Energy' };
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'sensor.pulse_counter': {
      base.platform = 'pulse_counter';
      if (inst.pins.pin != null) base.pin = `GPIO${inst.pins.pin}`;
      base.name = str(inst.config.name, inst.name);
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'sensor.wifi_signal': {
      base.platform = 'wifi_signal';
      base.name = str(inst.config.name, inst.name);
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'sensor.uptime': {
      base.platform = 'uptime';
      base.name = str(inst.config.name, inst.name);
      break;
    }
    // ── Binary sensors ──
    case 'binary_sensor.pir': {
      base.platform = 'gpio';
      const pirPin: Record<string, unknown> = {};
      if (inst.pins.pin != null) pirPin.number = `GPIO${inst.pins.pin}`;
      pirPin.mode = { input: true };
      base.pin = pirPin;
      base.name = str(inst.config.name, inst.name);
      base.device_class = inst.config.device_class || 'motion';
      break;
    }
    // ── Switches ──
    case 'switch.safe_mode': {
      base.platform = 'safe_mode';
      base.name = str(inst.config.name, inst.name);
      break;
    }
    // ── Outputs ──
    case 'output.esp8266_pwm': {
      base.platform = 'esp8266_pwm';
      if (inst.pins.pin != null) base.pin = `GPIO${inst.pins.pin}`;
      base.id = inst.id;
      if (inst.config.frequency) base.frequency = inst.config.frequency;
      break;
    }
    // ── BLE sensors ──
    case 'sensor.ble_rssi': {
      base.platform = 'ble_rssi';
      base.name = str(inst.config.name, inst.name);
      if (inst.config.mac_address) base.mac_address = inst.config.mac_address;
      break;
    }
    case 'binary_sensor.ble_presence': {
      base.platform = 'ble_presence';
      base.name = str(inst.config.name, inst.name);
      if (inst.config.mac_address) base.mac_address = inst.config.mac_address;
      if (inst.config.ibeacon_uuid) base.ibeacon_uuid = inst.config.ibeacon_uuid;
      break;
    }
    case 'sensor.xiaomi_ble': {
      // Map model to ESPHome platform name
      const xiaomiModelMap: Record<string, string> = {
        LYWSD03MMC: 'xiaomi_lywsd03mmc',
        CGG1: 'xiaomi_cgg1',
        CGDK2: 'xiaomi_cgdk2',
        JQJCY01YM: 'xiaomi_jqjcy01ym',
        HHCCJCY01: 'xiaomi_hhccjcy01',
      };
      const model = (inst.config.model as string) || 'LYWSD03MMC';
      base.platform = xiaomiModelMap[model] || 'xiaomi_lywsd03mmc';
      base.name = str(inst.config.name, inst.name);
      if (inst.config.mac_address) base.mac_address = inst.config.mac_address;
      break;
    }
    // ── Climate ──
    case 'climate.ir': {
      base.platform = inst.config.protocol || 'coolix';
      base.name = str(inst.config.name, inst.name);
      // Link to auto-generated transmitter if no standalone one
      const hasStandaloneTransmitter = project.components.some(
        (c) => c.type === 'ir.transmitter' && c.pins.pin === inst.pins.pin,
      );
      if (hasStandaloneTransmitter) {
        const t = project.components.find(
          (c) => c.type === 'ir.transmitter' && c.pins.pin === inst.pins.pin,
        );
        if (t) base.transmitter_id = t.id;
      } else {
        base.transmitter_id = `${inst.id}_transmitter`;
      }
      if (inst.config.sensor) base.sensor = inst.config.sensor;
      if (inst.config.supports_cool === false) base.supports_cool = false;
      if (inst.config.supports_heat === false) base.supports_heat = false;
      break;
    }
    case 'climate.thermostat': {
      base.platform = 'thermostat';
      base.name = str(inst.config.name, inst.name);
      base.sensor = inst.config.sensor || 'REPLACE_WITH_TEMP_SENSOR_ID';
      base.default_target_temperature_low = inst.config.default_target || 21;
      base.heat_action = [{ 'switch.turn_on': 'REPLACE_WITH_HEATER_SWITCH_ID' }];
      base.idle_action = [{ 'switch.turn_off': 'REPLACE_WITH_HEATER_SWITCH_ID' }];
      if (inst.config.heat_deadband) base.heat_deadband = inst.config.heat_deadband;
      if (inst.config.cool_deadband) base.cool_deadband = inst.config.cool_deadband;
      if (inst.config.min_temperature) base.min_temperature = inst.config.min_temperature;
      if (inst.config.max_temperature) base.max_temperature = inst.config.max_temperature;
      break;
    }
    // ── Media ──
    case 'media.speaker': {
      base.platform = 'i2s_audio';
      base.dac_type = inst.config.dac_type || 'external';
      if (inst.config.i2s_audio_id) base.i2s_audio_id = inst.config.i2s_audio_id;
      break;
    }
    case 'media.microphone': {
      base.platform = 'i2s_audio';
      base.adc_type = inst.config.adc_type || 'external';
      if (inst.pins.din_pin != null) base.i2s_din_pin = `GPIO${inst.pins.din_pin}`;
      break;
    }
    case 'media.dfplayer':
    case 'media.rtttl':
      return null; // handled as top-level sections
    // ── Misc ──
    case 'misc.servo': {
      base.id = inst.config.id || inst.id;
      base.output = `${inst.id}_output`;
      if (inst.config.min_level) base.min_level = inst.config.min_level;
      if (inst.config.idle_level) base.idle_level = inst.config.idle_level;
      if (inst.config.max_level) base.max_level = inst.config.max_level;
      break;
    }
    case 'misc.stepper': {
      base.platform = 'a4988';
      base.id = inst.config.id || inst.id;
      if (inst.pins.step_pin != null) base.step_pin = `GPIO${inst.pins.step_pin}`;
      if (inst.pins.dir_pin != null) base.dir_pin = `GPIO${inst.pins.dir_pin}`;
      if (inst.config.max_speed) base.max_speed = inst.config.max_speed;
      if (inst.config.acceleration) base.acceleration = inst.config.acceleration;
      if (inst.config.deceleration) base.deceleration = inst.config.deceleration;
      break;
    }
    case 'misc.rotary_encoder': {
      base.platform = 'rotary_encoder';
      base.name = str(inst.config.name, inst.name);
      if (inst.pins.pin_a != null) base.pin_a = `GPIO${inst.pins.pin_a}`;
      if (inst.pins.pin_b != null) base.pin_b = `GPIO${inst.pins.pin_b}`;
      if (inst.config.min_value != null) base.min_value = Number(inst.config.min_value);
      if (inst.config.max_value != null) base.max_value = Number(inst.config.max_value);
      break;
    }
    case 'text_sensor.version': {
      base.platform = 'version';
      base.name = str(inst.config.name, inst.name);
      break;
    }
    case 'text_sensor.wifi_info': {
      base.platform = 'wifi_info';
      base.ip_address = { name: str(inst.config.ip_address_name, 'IP Address') };
      base.ssid = { name: str(inst.config.ssid_name, 'Connected SSID') };
      break;
    }
    // ── BLE tracker/proxy handled at top level ──
    case 'bluetooth.proxy':
    case 'bluetooth.tracker':
    case 'ir.receiver':
    case 'ir.transmitter':
    case 'media.i2s_audio':
    case 'misc.deep_sleep':
    case 'misc.pcf8574':
      return null; // handled as top-level sections

    // ── Fans ──
    case 'fan.speed': {
      base.platform = 'speed';
      base.name = str(inst.config.name, inst.name);
      base.output = `${inst.id}_output`;
      if (inst.config.speed_count) base.speed_count = Number(inst.config.speed_count);
      break;
    }
    case 'fan.binary': {
      base.platform = 'binary';
      base.name = str(inst.config.name, inst.name);
      base.output = `${inst.id}_output`;
      break;
    }
    case 'fan.hbridge': {
      base.platform = 'hbridge';
      base.name = str(inst.config.name, inst.name);
      base.pin_a = `${inst.id}_output_a`;
      base.pin_b = `${inst.id}_output_b`;
      if (inst.config.speed_count) base.speed_count = Number(inst.config.speed_count);
      if (inst.config.decay_mode) base.decay_mode = inst.config.decay_mode;
      break;
    }

    // ── Covers ──
    case 'cover.time_based': {
      base.platform = 'time_based';
      base.name = str(inst.config.name, inst.name);
      if (inst.config.device_class) base.device_class = inst.config.device_class;
      base.open_action = [{ 'switch.turn_on': `${inst.id}_open` }];
      base.open_duration = inst.config.open_duration || '20s';
      base.close_action = [{ 'switch.turn_on': `${inst.id}_close` }];
      base.close_duration = inst.config.close_duration || '20s';
      base.stop_action = [
        { 'switch.turn_off': `${inst.id}_open` },
        { 'switch.turn_off': `${inst.id}_close` },
      ];
      break;
    }
    case 'cover.endstop': {
      base.platform = 'endstop';
      base.name = str(inst.config.name, inst.name);
      if (inst.config.device_class) base.device_class = inst.config.device_class;
      if (inst.config.max_duration) base.max_duration = inst.config.max_duration;
      if (inst.pins.open_pin != null) base.open_action = [{ 'switch.turn_on': `${inst.id}_open` }];
      if (inst.pins.close_pin != null) base.close_action = [{ 'switch.turn_on': `${inst.id}_close` }];
      base.stop_action = [
        { 'switch.turn_off': `${inst.id}_open` },
        { 'switch.turn_off': `${inst.id}_close` },
      ];
      if (inst.pins.open_endstop_pin != null) {
        base.open_endstop = { pin: { number: `GPIO${inst.pins.open_endstop_pin}`, mode: { input: true, pullup: true } } };
      }
      if (inst.pins.close_endstop_pin != null) {
        base.close_endstop = { pin: { number: `GPIO${inst.pins.close_endstop_pin}`, mode: { input: true, pullup: true } } };
      }
      break;
    }
    case 'cover.template': {
      base.platform = 'template';
      base.name = str(inst.config.name, inst.name);
      if (inst.config.device_class) base.device_class = inst.config.device_class;
      if (inst.config.optimistic) base.optimistic = true;
      break;
    }

    // ── Buttons ──
    case 'button.restart': {
      base.platform = 'restart';
      base.name = str(inst.config.name, inst.name);
      break;
    }
    case 'button.safe_mode': {
      base.platform = 'safe_mode';
      base.name = str(inst.config.name, inst.name);
      break;
    }
    case 'button.shutdown': {
      base.platform = 'shutdown';
      base.name = str(inst.config.name, inst.name);
      break;
    }
    case 'button.factory_reset': {
      base.platform = 'factory_reset';
      base.name = str(inst.config.name, inst.name);
      break;
    }
    case 'button.template': {
      base.platform = 'template';
      base.name = str(inst.config.name, inst.name);
      break;
    }

    // ── Number ──
    case 'number.template': {
      base.platform = 'template';
      base.name = str(inst.config.name, inst.name);
      base.min_value = inst.config.min_value ?? 0;
      base.max_value = inst.config.max_value ?? 100;
      base.step = inst.config.step ?? 1;
      if (inst.config.initial_value != null) base.initial_value = Number(inst.config.initial_value);
      if (inst.config.unit_of_measurement) base.unit_of_measurement = inst.config.unit_of_measurement;
      if (inst.config.optimistic) base.optimistic = true;
      if (inst.config.restore_value) base.restore_value = true;
      base.set_action = [{ 'logger.log': 'Number set to: ' }];
      break;
    }

    // ── Select ──
    case 'select.template': {
      base.platform = 'template';
      base.name = str(inst.config.name, inst.name);
      const optionsCsv = (inst.config.options_csv as string) || '';
      base.options = optionsCsv.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (inst.config.initial_option) base.initial_option = inst.config.initial_option;
      if (inst.config.optimistic) base.optimistic = true;
      if (inst.config.restore_value) base.restore_value = true;
      base.set_action = [{ 'logger.log': 'Select set to: ' }];
      break;
    }

    // ── Text ──
    case 'text.template': {
      base.platform = 'template';
      base.name = str(inst.config.name, inst.name);
      if (inst.config.initial_value) base.initial_value = inst.config.initial_value;
      if (inst.config.min_length != null) base.min_length = Number(inst.config.min_length);
      if (inst.config.max_length != null) base.max_length = Number(inst.config.max_length);
      if (inst.config.optimistic) base.optimistic = true;
      if (inst.config.restore_value) base.restore_value = true;
      base.set_action = [{ 'logger.log': 'Text set to: ' }];
      break;
    }

    // ── Lock ──
    case 'lock.gpio': {
      base.platform = 'output';
      base.name = str(inst.config.name, inst.name);
      base.id = inst.id;
      base.output = `${inst.id}_output`;
      break;
    }
    case 'lock.template': {
      base.platform = 'template';
      base.name = str(inst.config.name, inst.name);
      if (inst.config.optimistic) base.optimistic = true;
      base.lock_action = [{ 'logger.log': 'Locking...' }];
      base.unlock_action = [{ 'logger.log': 'Unlocking...' }];
      break;
    }

    // ── More sensors ──
    case 'sensor.sgp30': {
      base.platform = 'sgp30';
      base.eco2 = { name: str(inst.config.eco2_name, 'eCO2') };
      base.tvoc = { name: str(inst.config.tvoc_name, 'TVOC') };
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'sensor.scd4x': {
      base.platform = 'scd4x';
      base.co2 = { name: str(inst.config.co2_name, 'CO2') };
      base.temperature = { name: str(inst.config.temperature_name, 'Temperature') };
      base.humidity = { name: str(inst.config.humidity_name, 'Humidity') };
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'sensor.pmsx003': {
      base.platform = 'pmsx003';
      base.type = inst.config.type || 'PMSX003';
      base.uart_id = `${inst.id}_uart`;
      base.pm_1_0 = { name: str(inst.config.pm_1_0_name, 'PM 1.0') };
      base.pm_2_5 = { name: str(inst.config.pm_2_5_name, 'PM 2.5') };
      base.pm_10_0 = { name: str(inst.config.pm_10_0_name, 'PM 10.0') };
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'sensor.max6675': {
      base.platform = 'max6675';
      base.name = str(inst.config.name, inst.name);
      if (inst.pins.cs_pin != null) base.cs_pin = `GPIO${inst.pins.cs_pin}`;
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'sensor.max31855': {
      base.platform = 'max31855';
      base.name = str(inst.config.name, inst.name);
      if (inst.pins.cs_pin != null) base.cs_pin = `GPIO${inst.pins.cs_pin}`;
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'sensor.vl53l0x': {
      base.platform = 'vl53l0x';
      base.name = str(inst.config.name, inst.name);
      if (inst.config.address) base.address = inst.config.address;
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'sensor.hlw8012': {
      base.platform = 'hlw8012';
      if (inst.pins.sel_pin != null) {
        base.sel_pin = inst.config.sel_pin_inverted
          ? { number: `GPIO${inst.pins.sel_pin}`, inverted: true }
          : `GPIO${inst.pins.sel_pin}`;
      }
      if (inst.pins.cf_pin != null) base.cf_pin = `GPIO${inst.pins.cf_pin}`;
      if (inst.pins.cf1_pin != null) base.cf1_pin = `GPIO${inst.pins.cf1_pin}`;
      base.voltage = { name: str(inst.config.voltage_name, 'Voltage') };
      base.current = { name: str(inst.config.current_name, 'Current') };
      base.power = { name: str(inst.config.power_name, 'Power') };
      if (inst.config.current_resistor) base.current_resistor = Number(inst.config.current_resistor);
      if (inst.config.voltage_divider) base.voltage_divider = Number(inst.config.voltage_divider);
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'sensor.cse7766': {
      base.platform = 'cse7766';
      base.uart_id = `${inst.id}_uart`;
      base.voltage = { name: str(inst.config.voltage_name, 'Voltage') };
      base.current = { name: str(inst.config.current_name, 'Current') };
      base.power = { name: str(inst.config.power_name, 'Power') };
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }
    case 'sensor.ntc': {
      base.platform = 'ntc';
      base.name = str(inst.config.name, inst.name);
      base.sensor = inst.config.sensor_id || 'REPLACE_WITH_ADC_SENSOR_ID';
      base.calibration = {
        b_constant: Number(inst.config.b_constant) || 3950,
        reference_temperature: inst.config.reference_temperature || '25°C',
        reference_resistance: inst.config.reference_resistance || '10kΩ',
      };
      break;
    }
    case 'sensor.template': {
      base.platform = 'template';
      base.name = str(inst.config.name, inst.name);
      if (inst.config.unit_of_measurement) base.unit_of_measurement = inst.config.unit_of_measurement;
      if (inst.config.accuracy_decimals != null) base.accuracy_decimals = Number(inst.config.accuracy_decimals);
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }

    // ── LD2410 mmWave ──
    case 'sensor.ld2410': {
      base.platform = 'ld2410';
      // uart_id belongs only in the top-level ld2410: hub section, not here
      const mdName = inst.config.moving_distance_name as string | undefined;
      const sdName = inst.config.still_distance_name as string | undefined;
      const ddName = inst.config.detection_distance_name as string | undefined;
      const meName = inst.config.moving_energy_name as string | undefined;
      const seName = inst.config.still_energy_name as string | undefined;
      if (mdName) base.moving_distance = { name: mdName };
      if (sdName) base.still_distance = { name: sdName };
      if (ddName) base.detection_distance = { name: ddName };
      if (meName) base.moving_energy = { name: meName };
      if (seName) base.still_energy = { name: seName };
      break;
    }

    // ── LD2450 mmWave multi-target ──
    case 'sensor.ld2450': {
      base.platform = 'ld2450';
      base.ld2450_id = `${inst.id}_hub`;
      const tcName = inst.config.target_count_name as string | undefined;
      if (tcName) base.target_count = { name: tcName };
      break;
    }

    // ── LD2411S mmWave ──
    case 'sensor.ld2411s': {
      base.platform = 'ld2411s';
      base.name = str(inst.config.name as string, inst.name);
      break;
    }

    // ── ADS1115 ──
    case 'sensor.ads1115': {
      base.platform = 'ads1115';
      base.name = str(inst.config.name, inst.name);
      base.ads1115_id = inst.config.ads1115_id || inst.id + '_hub';
      base.multiplexer = inst.config.multiplexer || 'A0_GND';
      base.gain = Number(inst.config.gain) || 6.144;
      if (inst.config.update_interval) base.update_interval = inst.config.update_interval;
      break;
    }

    // ── Pulse Meter ──
    case 'sensor.pulse_meter': {
      base.platform = 'pulse_meter';
      if (inst.pins.pin != null) base.pin = `GPIO${inst.pins.pin}`;
      base.name = str(inst.config.name, inst.name);
      if (inst.config.unit_of_measurement) base.unit_of_measurement = inst.config.unit_of_measurement;
      if (inst.config.internal_filter) base.internal_filter = inst.config.internal_filter;
      if (inst.config.total_name) {
        base.total = {
          name: str(inst.config.total_name, 'Total'),
          unit_of_measurement: inst.config.total_unit || 'Wh',
        };
      }
      break;
    }

    // ── More binary sensors ──
    case 'binary_sensor.template': {
      base.platform = 'template';
      base.name = str(inst.config.name, inst.name);
      if (inst.config.device_class) base.device_class = inst.config.device_class;
      break;
    }
    case 'binary_sensor.analog_threshold': {
      base.platform = 'analog_threshold';
      base.name = str(inst.config.name, inst.name);
      base.sensor_id = inst.config.sensor_id || 'REPLACE_WITH_SENSOR_ID';
      base.threshold = {
        upper: Number(inst.config.threshold_upper) || 0.8,
        lower: Number(inst.config.threshold_lower) || 0.3,
      };
      break;
    }

    // ── ESP32 Touch Pad ──
    case 'binary_sensor.esp32_touch': {
      base.platform = 'esp32_touch';
      base.name = str(inst.config.name, inst.name);
      if (inst.pins.pin != null) base.pin = `GPIO${inst.pins.pin}`;
      base.threshold = Number(inst.config.threshold) || 1000;
      break;
    }

    // ── More switches ──
    case 'switch.template': {
      base.platform = 'template';
      base.name = str(inst.config.name, inst.name);
      if (inst.config.optimistic) base.optimistic = true;
      if (inst.config.restore_mode) base.restore_mode = inst.config.restore_mode;
      base.turn_on_action = [{ 'logger.log': 'Turning on' }];
      base.turn_off_action = [{ 'logger.log': 'Turning off' }];
      break;
    }
    case 'switch.uart': {
      base.platform = 'uart';
      base.name = str(inst.config.name, inst.name);
      base.uart_id = `${inst.id}_uart`;
      if (inst.config.data_on) base.data = (inst.config.data_on as string).split(' ');
      break;
    }

    // ── More lights ──
    case 'light.cwww': {
      base.platform = 'cwww';
      base.name = str(inst.config.name, inst.name);
      base.cold_white = `${inst.id}_cw_output`;
      base.warm_white = `${inst.id}_ww_output`;
      if (inst.config.cold_white_color_temperature) base.cold_white_color_temperature = inst.config.cold_white_color_temperature;
      if (inst.config.warm_white_color_temperature) base.warm_white_color_temperature = inst.config.warm_white_color_temperature;
      break;
    }
    case 'light.rgb': {
      base.platform = 'rgb';
      base.name = str(inst.config.name, inst.name);
      base.red = `${inst.id}_red_output`;
      base.green = `${inst.id}_green_output`;
      base.blue = `${inst.id}_blue_output`;
      break;
    }
    case 'light.rgbw': {
      base.platform = 'rgbw';
      base.name = str(inst.config.name, inst.name);
      base.red = `${inst.id}_red_output`;
      base.green = `${inst.id}_green_output`;
      base.blue = `${inst.id}_blue_output`;
      base.white = `${inst.id}_white_output`;
      break;
    }

    // ── ESP32 RMT LED Strip ──
    case 'light.esp32_rmt': {
      base.platform = 'esp32_rmt_led_strip';
      base.name = str(inst.config.name, inst.name);
      if (inst.pins.pin != null) base.pin = `GPIO${inst.pins.pin}`;
      base.num_leds = Number(inst.config.num_leds) || 30;
      base.chipset = inst.config.chipset || 'WS2812';
      base.rgb_order = inst.config.rgb_order || 'GRB';
      if (inst.config.rmt_channel != null) base.rmt_channel = Number(inst.config.rmt_channel);
      break;
    }

    default:
      return null;
  }

  return base;
}

// ── Generate output entry for lights that need one ──

function generateOutputForLight(
  inst: ComponentInstance,
  _project: Project,
): Record<string, unknown> | Record<string, unknown>[] | null {
  switch (inst.type) {
    case 'light.binary': {
      return {
        platform: 'gpio',
        pin: inst.pins.pin != null ? `GPIO${inst.pins.pin}` : 'GPIOXX',
        id: `${inst.id}_output`,
      };
    }
    case 'light.monochromatic': {
      return {
        platform: 'ledc',
        pin: inst.pins.pin != null ? `GPIO${inst.pins.pin}` : 'GPIOXX',
        id: `${inst.id}_output`,
        frequency: (inst.config.frequency as string) || '1000Hz',
      };
    }
    case 'light.cwww': {
      return [
        {
          platform: 'ledc',
          pin: inst.pins.cw_pin != null ? `GPIO${inst.pins.cw_pin}` : 'GPIOXX',
          id: `${inst.id}_cw_output`,
          frequency: '1000Hz',
        },
        {
          platform: 'ledc',
          pin: inst.pins.ww_pin != null ? `GPIO${inst.pins.ww_pin}` : 'GPIOXX',
          id: `${inst.id}_ww_output`,
          frequency: '1000Hz',
        },
      ];
    }
    case 'light.rgb': {
      return [
        { platform: 'ledc', pin: inst.pins.red_pin != null ? `GPIO${inst.pins.red_pin}` : 'GPIOXX', id: `${inst.id}_red_output`, frequency: '1000Hz' },
        { platform: 'ledc', pin: inst.pins.green_pin != null ? `GPIO${inst.pins.green_pin}` : 'GPIOXX', id: `${inst.id}_green_output`, frequency: '1000Hz' },
        { platform: 'ledc', pin: inst.pins.blue_pin != null ? `GPIO${inst.pins.blue_pin}` : 'GPIOXX', id: `${inst.id}_blue_output`, frequency: '1000Hz' },
      ];
    }
    case 'light.rgbw': {
      return [
        { platform: 'ledc', pin: inst.pins.red_pin != null ? `GPIO${inst.pins.red_pin}` : 'GPIOXX', id: `${inst.id}_red_output`, frequency: '1000Hz' },
        { platform: 'ledc', pin: inst.pins.green_pin != null ? `GPIO${inst.pins.green_pin}` : 'GPIOXX', id: `${inst.id}_green_output`, frequency: '1000Hz' },
        { platform: 'ledc', pin: inst.pins.blue_pin != null ? `GPIO${inst.pins.blue_pin}` : 'GPIOXX', id: `${inst.id}_blue_output`, frequency: '1000Hz' },
        { platform: 'ledc', pin: inst.pins.white_pin != null ? `GPIO${inst.pins.white_pin}` : 'GPIOXX', id: `${inst.id}_white_output`, frequency: '1000Hz' },
      ];
    }
    case 'fan.speed': {
      return {
        platform: 'ledc',
        pin: inst.pins.pin != null ? `GPIO${inst.pins.pin}` : 'GPIOXX',
        id: `${inst.id}_output`,
        frequency: '1000Hz',
      };
    }
    case 'fan.binary': {
      return {
        platform: 'gpio',
        pin: inst.pins.pin != null ? `GPIO${inst.pins.pin}` : 'GPIOXX',
        id: `${inst.id}_output`,
      };
    }
    case 'fan.hbridge': {
      return [
        { platform: 'ledc', pin: inst.pins.pin_a != null ? `GPIO${inst.pins.pin_a}` : 'GPIOXX', id: `${inst.id}_output_a`, frequency: '1000Hz' },
        { platform: 'ledc', pin: inst.pins.pin_b != null ? `GPIO${inst.pins.pin_b}` : 'GPIOXX', id: `${inst.id}_output_b`, frequency: '1000Hz' },
      ];
    }
    case 'lock.gpio': {
      return {
        platform: 'gpio',
        pin: inst.pins.pin != null ? `GPIO${inst.pins.pin}` : 'GPIOXX',
        id: `${inst.id}_output`,
        inverted: inst.config.inverted || false,
      };
    }
    case 'media.rtttl':
    case 'misc.servo': {
      return {
        platform: 'ledc',
        pin: inst.pins.pin != null ? `GPIO${inst.pins.pin}` : 'GPIOXX',
        id: `${inst.id}_output`,
        frequency: '1000Hz',
      };
    }
    default:
      return null;
  }
}

// ── Format automation action ──

function formatAction(
  action: { type: string; config: Record<string, unknown> },
  project: Project,
): unknown {
  const targetId = action.config.targetId as string | undefined;
  const targetInst = targetId
    ? project.components.find((c) => c.id === targetId)
    : undefined;
  const targetRef = targetInst?.id || (action.config.target as string) || '';

  switch (action.type) {
    case 'switch.toggle':
      return { 'switch.toggle': targetRef };
    case 'switch.turn_on':
      return { 'switch.turn_on': targetRef };
    case 'switch.turn_off':
      return { 'switch.turn_off': targetRef };
    case 'light.toggle':
      return { 'light.toggle': targetRef };
    case 'light.turn_on': {
      const opts: Record<string, unknown> = { id: targetRef };
      if (action.config.brightness) opts.brightness = `${action.config.brightness}%`;
      return { 'light.turn_on': opts };
    }
    case 'light.turn_off':
      return { 'light.turn_off': targetRef };
    case 'fan.toggle':
      return { 'fan.toggle': targetRef };
    case 'fan.turn_on':
      return { 'fan.turn_on': targetRef };
    case 'fan.turn_off':
      return { 'fan.turn_off': targetRef };
    case 'cover.open':
      return { 'cover.open': targetRef };
    case 'cover.close':
      return { 'cover.close': targetRef };
    case 'cover.stop':
      return { 'cover.stop': targetRef };
    case 'lock.lock':
      return { 'lock.lock': targetRef };
    case 'lock.unlock':
      return { 'lock.unlock': targetRef };
    case 'number.set': {
      const nOpts: Record<string, unknown> = { id: targetRef };
      if (action.config.value != null) nOpts.value = Number(action.config.value);
      return { 'number.set': nOpts };
    }
    case 'output.turn_on':
      return { 'output.turn_on': targetRef };
    case 'output.turn_off':
      return { 'output.turn_off': targetRef };
    case 'delay':
      return { delay: (action.config.delay as string) || '1s' };
    case 'logger.log':
      return { 'logger.log': (action.config.message as string) || 'Action triggered' };
    case 'mqtt.publish':
      return {
        'mqtt.publish': {
          topic: (action.config.topic as string) || '',
          payload: (action.config.payload as string) || '',
        },
      };
    default:
      return {};
  }
}

function str(val: unknown, fallback: string): string {
  return typeof val === 'string' && val.length > 0 ? val : fallback;
}

/** Generate a secrets.yaml file based on which secret flags are enabled */
export function generateSecretsYaml(project: Project): string | null {
  const s = project.settings;
  const anySecrets = s.useSecretsWifi || s.useSecretsApi || s.useSecretsOta || s.useSecretsMqtt;
  if (!anySecrets) return null;

  const lines: string[] = [
    '# Secrets file — keep this private, do not commit to version control',
    '',
  ];

  if (s.useSecretsWifi) {
    lines.push(`wifi_ssid: "${s.wifiSsid || 'YOUR_WIFI_SSID'}"`);
    lines.push(`wifi_password: "${s.wifiPassword || 'YOUR_WIFI_PASSWORD'}"`);
  }

  if (s.useSecretsApi && s.apiEnabled) {
    lines.push(`api_key: "${s.apiKey || 'YOUR_API_KEY'}"`);
  }

  if (s.useSecretsOta && s.otaEnabled) {
    lines.push(`ota_password: "${s.otaPassword || 'YOUR_OTA_PASSWORD'}"`);
  }

  if (s.useSecretsMqtt && s.mqttEnabled) {
    lines.push(`mqtt_username: "${s.mqttUsername || 'YOUR_MQTT_USERNAME'}"`);
    lines.push(`mqtt_password: "${s.mqttPassword || 'YOUR_MQTT_PASSWORD'}"`);
  }

  lines.push('');
  return lines.join('\n');
}
