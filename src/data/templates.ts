import type { ComponentInstance, Automation } from '../types';

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Board IDs this template works well with (first is recommended) */
  recommendedBoards: string[];
  components: ComponentInstance[];
  automations: Automation[];
  settingsOverrides?: Record<string, unknown>;
  tags: string[];
}

export const projectTemplates: ProjectTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Project',
    description: 'Start from scratch — pick your own components.',
    icon: 'FileText',
    recommendedBoards: [],
    components: [],
    automations: [],
    tags: ['basic'],
  },
  {
    id: 'basic_sensor_node',
    name: 'Basic Sensor Node',
    description: 'Temperature + humidity (DHT22) with status LED and WiFi info.',
    icon: 'Thermometer',
    recommendedBoards: ['esp32dev', 'nodemcuv2', 'd1_mini'],
    components: [
      { id: 'sensor_1', type: 'sensor.dht', name: 'DHT22 Sensor', config: { name: 'Temperature & Humidity', model: 'DHT22', update_interval: '60s' }, pins: { pin: null } },
      { id: 'sensor_2', type: 'sensor.wifi_signal', name: 'WiFi Signal', config: { name: 'WiFi Signal', update_interval: '60s' }, pins: {} },
      { id: 'text_sensor_3', type: 'text_sensor.version', name: 'ESPHome Version', config: { name: 'ESPHome Version' }, pins: {} },
      { id: 'text_sensor_4', type: 'text_sensor.wifi_info', name: 'WiFi Info', config: { ip_address_name: 'IP Address', ssid_name: 'Connected SSID' }, pins: {} },
      { id: 'button_5', type: 'button.restart', name: 'Restart', config: { name: 'Restart' }, pins: {} },
    ],
    automations: [],
    tags: ['sensor', 'beginner', 'temperature'],
  },
  {
    id: 'smart_relay',
    name: 'Smart Relay / Plug',
    description: 'GPIO relay with physical button toggle and status LED. Perfect for Sonoff Basic.',
    icon: 'Plug',
    recommendedBoards: ['sonoff_basic', 'sonoff_basic_r4', 'esp32dev', 'd1_mini'],
    components: [
      { id: 'switch_1', type: 'switch.gpio', name: 'Relay', config: { name: 'Relay', restore_mode: 'RESTORE_DEFAULT_OFF' }, pins: { pin: null } },
      { id: 'binary_sensor_2', type: 'binary_sensor.gpio', name: 'Physical Button', config: { name: 'Button', device_class: 'None' }, pins: { pin: null } },
      { id: 'sensor_3', type: 'sensor.wifi_signal', name: 'WiFi Signal', config: { name: 'WiFi Signal', update_interval: '60s' }, pins: {} },
      { id: 'sensor_5', type: 'sensor.uptime', name: 'Uptime', config: { name: 'Uptime' }, pins: {} },
      { id: 'button_6', type: 'button.restart', name: 'Restart', config: { name: 'Restart' }, pins: {} },
    ],
    automations: [
      {
        id: 'auto_1',
        name: 'Button Toggle Relay',
        trigger: { type: 'component_state', componentId: 'binary_sensor_2', event: 'on_press', config: {} },
        conditions: [],
        actions: [{ id: 'act_1', type: 'switch.toggle', config: { targetId: 'switch_1' } }],
      },
    ],
    tags: ['relay', 'sonoff', 'plug', 'beginner'],
  },
  {
    id: 'led_strip',
    name: 'Addressable LED Strip',
    description: 'WS2812B / NeoPixel strip with status LED and effects ready.',
    icon: 'Palette',
    recommendedBoards: ['esp32dev', 'esp32s3_devkitc', 'd1_mini'],
    components: [
      { id: 'light_1', type: 'light.neopixelbus', name: 'LED Strip', config: { name: 'LED Strip', num_leds: 60, chipset: 'WS2812B', rgb_order: 'GRB' }, pins: { pin: null } },
      { id: 'sensor_2', type: 'sensor.wifi_signal', name: 'WiFi Signal', config: { name: 'WiFi Signal', update_interval: '60s' }, pins: {} },
      { id: 'button_3', type: 'button.restart', name: 'Restart', config: { name: 'Restart' }, pins: {} },
    ],
    automations: [],
    tags: ['light', 'led', 'neopixel', 'rgb'],
  },
  {
    id: 'environment_monitor',
    name: 'Environment Monitor',
    description: 'BME280 (temp/humidity/pressure) + SCD41 CO2 + WiFi diagnostics.',
    icon: 'Leaf',
    recommendedBoards: ['esp32dev', 'esp32s3_devkitc', 'seeed_xiao_esp32c3'],
    components: [
      { id: 'sensor_1', type: 'sensor.bme280', name: 'BME280', config: { name: 'BME280', address: '0x76', temperature_name: 'Temperature', humidity_name: 'Humidity', pressure_name: 'Pressure', update_interval: '60s' }, pins: {} },
      { id: 'sensor_2', type: 'sensor.scd4x', name: 'SCD41 CO2', config: { name: 'CO2 Monitor', co2_name: 'CO2', temperature_name: 'SCD41 Temp', humidity_name: 'SCD41 Humidity', update_interval: '60s' }, pins: {} },
      { id: 'sensor_3', type: 'sensor.wifi_signal', name: 'WiFi Signal', config: { name: 'WiFi Signal', update_interval: '60s' }, pins: {} },
      { id: 'text_sensor_4', type: 'text_sensor.wifi_info', name: 'WiFi Info', config: { ip_address_name: 'IP Address', ssid_name: 'Connected SSID' }, pins: {} },
      { id: 'button_5', type: 'button.restart', name: 'Restart', config: { name: 'Restart' }, pins: {} },
    ],
    automations: [],
    tags: ['sensor', 'co2', 'environment', 'i2c', 'air quality'],
  },
  {
    id: 'motion_light',
    name: 'Motion-Activated Light',
    description: 'PIR motion sensor that auto-toggles a relay/light with configurable timeout.',
    icon: 'Lightbulb',
    recommendedBoards: ['esp32dev', 'd1_mini', 'esp32c3_devkitm'],
    components: [
      { id: 'binary_sensor_1', type: 'binary_sensor.gpio', name: 'PIR Motion', config: { name: 'Motion', device_class: 'motion' }, pins: { pin: null } },
      { id: 'switch_2', type: 'switch.gpio', name: 'Light Relay', config: { name: 'Light', restore_mode: 'RESTORE_DEFAULT_OFF' }, pins: { pin: null } },
      { id: 'sensor_3', type: 'sensor.wifi_signal', name: 'WiFi Signal', config: { name: 'WiFi Signal', update_interval: '60s' }, pins: {} },
      { id: 'button_4', type: 'button.restart', name: 'Restart', config: { name: 'Restart' }, pins: {} },
    ],
    automations: [
      {
        id: 'auto_1',
        name: 'Motion On',
        trigger: { type: 'component_state', componentId: 'binary_sensor_1', event: 'on_press', config: {} },
        conditions: [],
        actions: [{ id: 'act_1', type: 'switch.turn_on', config: { targetId: 'switch_2' } }],
      },
      {
        id: 'auto_2',
        name: 'Motion Off (delayed)',
        trigger: { type: 'component_state', componentId: 'binary_sensor_1', event: 'on_release', config: {} },
        conditions: [],
        actions: [
          { id: 'act_2', type: 'delay', config: { delay: '2min' } },
          { id: 'act_3', type: 'switch.turn_off', config: { targetId: 'switch_2' } },
        ],
      },
    ],
    tags: ['motion', 'pir', 'automation', 'light'],
  },
  {
    id: 'ble_gateway',
    name: 'BLE Gateway / Proxy',
    description: 'Bluetooth proxy for Home Assistant with WiFi diagnostics. Requires ESP32 with BLE.',
    icon: 'Radio',
    recommendedBoards: ['esp32dev', 'esp32s3_devkitc', 'esp32s3_n16r8', 'm5stack_atom_lite'],
    components: [
      { id: 'bluetooth_1', type: 'bluetooth.proxy', name: 'BLE Proxy', config: { active: true }, pins: {} },
      { id: 'sensor_2', type: 'sensor.wifi_signal', name: 'WiFi Signal', config: { name: 'WiFi Signal', update_interval: '60s' }, pins: {} },
      { id: 'sensor_3', type: 'sensor.uptime', name: 'Uptime', config: { name: 'Uptime' }, pins: {} },
      { id: 'text_sensor_4', type: 'text_sensor.wifi_info', name: 'WiFi Info', config: { ip_address_name: 'IP Address', ssid_name: 'Connected SSID' }, pins: {} },
      { id: 'button_5', type: 'button.restart', name: 'Restart', config: { name: 'Restart' }, pins: {} },
    ],
    automations: [],
    tags: ['bluetooth', 'ble', 'proxy', 'gateway'],
  },
  {
    id: 'garage_door',
    name: 'Garage Door Controller',
    description: 'Relay + reed switch with time-based cover entity for Home Assistant.',
    icon: 'Home',
    recommendedBoards: ['esp32dev', 'd1_mini', 'esp32c3_devkitm'],
    components: [
      { id: 'cover_1', type: 'cover.time_based', name: 'Garage Door', config: { name: 'Garage Door', device_class: 'garage', open_duration: '15s', close_duration: '15s' }, pins: { open_pin: null, close_pin: null } },
      { id: 'binary_sensor_2', type: 'binary_sensor.gpio', name: 'Door Sensor', config: { name: 'Door Open', device_class: 'garage_door' }, pins: { pin: null } },
      { id: 'sensor_3', type: 'sensor.wifi_signal', name: 'WiFi Signal', config: { name: 'WiFi Signal', update_interval: '60s' }, pins: {} },
      { id: 'button_4', type: 'button.restart', name: 'Restart', config: { name: 'Restart' }, pins: {} },
    ],
    automations: [],
    tags: ['garage', 'cover', 'relay', 'door'],
  },
  {
    id: 'power_monitor',
    name: 'Power Monitor',
    description: 'HLW8012 energy monitoring (voltage, current, power). Great for Sonoff POW.',
    icon: 'Zap',
    recommendedBoards: ['esp32dev', 'sonoff_basic_r4', 'd1_mini'],
    components: [
      { id: 'sensor_1', type: 'sensor.hlw8012', name: 'Power Monitor', config: { name: 'Power Monitor', voltage_name: 'Voltage', current_name: 'Current', power_name: 'Power', sel_pin_inverted: true, current_resistor: '0.001', voltage_divider: '2351', update_interval: '10s' }, pins: { sel_pin: null, cf_pin: null, cf1_pin: null } },
      { id: 'sensor_2', type: 'sensor.wifi_signal', name: 'WiFi Signal', config: { name: 'WiFi Signal', update_interval: '60s' }, pins: {} },
      { id: 'button_3', type: 'button.restart', name: 'Restart', config: { name: 'Restart' }, pins: {} },
    ],
    automations: [],
    tags: ['power', 'energy', 'hlw8012', 'monitoring'],
  },
  {
    id: 'fan_controller',
    name: 'PWM Fan Controller',
    description: 'Variable-speed fan with physical button to cycle speeds.',
    icon: 'Fan',
    recommendedBoards: ['esp32dev', 'esp32c3_devkitm', 'd1_mini'],
    components: [
      { id: 'fan_1', type: 'fan.speed', name: 'Fan', config: { name: 'Fan', speed_count: 4 }, pins: { pin: null } },
      { id: 'binary_sensor_2', type: 'binary_sensor.gpio', name: 'Fan Button', config: { name: 'Fan Button', device_class: 'None' }, pins: { pin: null } },
      { id: 'sensor_3', type: 'sensor.wifi_signal', name: 'WiFi Signal', config: { name: 'WiFi Signal', update_interval: '60s' }, pins: {} },
      { id: 'button_4', type: 'button.restart', name: 'Restart', config: { name: 'Restart' }, pins: {} },
    ],
    automations: [],
    tags: ['fan', 'pwm', 'speed'],
  },
];
