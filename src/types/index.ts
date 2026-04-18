// ── Board Types ──

export type PinCapability =
  | 'gpio'
  | 'adc'
  | 'dac'
  | 'touch'
  | 'i2c_sda'
  | 'i2c_scl'
  | 'spi'
  | 'uart_tx'
  | 'uart_rx'
  | 'pwm'
  | 'input_only'
  | 'strapping';

export interface Pin {
  gpio: number;
  label: string;
  side: 'left' | 'right';
  capabilities: PinCapability[];
  notes?: string;
}

export interface Board {
  id: string;
  name: string;
  platform: 'esp32' | 'esp8266';
  variant?: 'esp32' | 'esp32s2' | 'esp32s3' | 'esp32c3' | 'esp32c6' | 'esp32h2';
  board: string; // ESPHome board identifier
  description: string;
  pins: Pin[];
  defaultI2C?: { sda: number; scl: number };
  hasBLE?: boolean;
  hasPSRAM?: boolean;
}

// ── Component Types ──

export type ComponentCategory =
  | 'sensor'
  | 'binary_sensor'
  | 'switch'
  | 'light'
  | 'output'
  | 'display'
  | 'climate'
  | 'media'
  | 'bluetooth'
  | 'ir'
  | 'fan'
  | 'cover'
  | 'button'
  | 'number'
  | 'select'
  | 'lock'
  | 'text'
  | 'misc';

export interface PinRequirement {
  role: string;
  label: string;
  capabilities: PinCapability[];
  optional?: boolean;
}

export type FieldType = 'text' | 'number' | 'select' | 'boolean' | 'password' | 'time';

export interface ConfigField {
  key: string;
  label: string;
  type: FieldType;
  default?: string | number | boolean;
  options?: { label: string; value: string }[];
  required?: boolean;
  unit?: string;
  placeholder?: string;
  group?: string;
}

export interface ComponentDefinition {
  type: string;
  platform: string;
  domain: string;
  category: ComponentCategory;
  name: string;
  description: string;
  icon: string;
  pins: PinRequirement[];
  configFields: ConfigField[];
  needsI2C?: boolean;
  needsSPI?: boolean;
  /** Extra top-level YAML sections this component contributes */
  extraDomains?: string[];
  /** Only show for these platforms. Omit = all platforms. */
  platformFilter?: ('esp32' | 'esp8266')[];
  /** Requires BLE hardware */
  requiresBLE?: boolean;
}

export interface ComponentInstance {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  pins: Record<string, number | null>;
}

// ── Automation Types ──

export interface AutomationTrigger {
  type: 'component_state' | 'time_interval' | 'on_boot' | 'value_range' | 'mqtt_message';
  componentId?: string;
  event?: string; // on_press, on_release, on_state, on_value
  config: Record<string, unknown>;
}

export interface AutomationCondition {
  id: string;
  type: 'lambda' | 'time_range' | 'sensor_in_range' | 'state_is';
  config: Record<string, unknown>;
}

export interface AutomationAction {
  id: string;
  type:
    | 'switch.toggle'
    | 'switch.turn_on'
    | 'switch.turn_off'
    | 'light.toggle'
    | 'light.turn_on'
    | 'light.turn_off'
    | 'fan.toggle'
    | 'fan.turn_on'
    | 'fan.turn_off'
    | 'cover.open'
    | 'cover.close'
    | 'cover.stop'
    | 'lock.lock'
    | 'lock.unlock'
    | 'number.set'
    | 'output.turn_on'
    | 'output.turn_off'
    | 'delay'
    | 'logger.log'
    | 'mqtt.publish';
  config: Record<string, unknown>;
}

export interface Automation {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
}

// ── Project State ──

export interface ProjectSettings {
  name: string;
  friendlyName: string;
  wifiSsid: string;
  wifiPassword: string;
  useSecretsWifi: boolean;
  useSecretsApi: boolean;
  useSecretsOta: boolean;
  useSecretsMqtt: boolean;
  staticIpEnabled: boolean;
  staticIp: string;
  gateway: string;
  subnet: string;
  dns: string;
  apiEnabled: boolean;
  apiKey: string;
  otaEnabled: boolean;
  otaPassword: string;
  mqttEnabled: boolean;
  mqttBroker: string;
  mqttPort: number;
  mqttUsername: string;
  mqttPassword: string;
  webServerEnabled: boolean;
  webServerPort: number;
  loggerEnabled: boolean;
  loggerLevel: string;
  captivePortalEnabled: boolean;
  fallbackApEnabled: boolean;
  fallbackApSsid: string;
  fallbackApPassword: string;
  statusLedPin: string;
  timeEnabled: boolean;
  timeTimezone: string;
  timeServers: string;
}

export interface Project {
  board: Board | null;
  settings: ProjectSettings;
  components: ComponentInstance[];
  automations: Automation[];
}
