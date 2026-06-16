# Changelog

## 0.1.7

- Fixed **YAML import** dropping several component types on round-trip — Bluetooth Proxy, IR Transmitter/Receiver, IR/RF Proxy, IR Climate (AC), the BME280/BMP280 I²C sensors, and the WiFi Info text sensor are now reconstructed when loading an existing config
- Import now recovers nested sub-entity names (e.g. temperature/humidity/pressure names on multi-value sensors) instead of losing them
- Fixed **duplicate components** when a starter template is applied to a board that auto-adds its own hardware (e.g. Sonoff Basic + Smart Relay): the template now supersedes the board default and inherits its correct pins, and applying a template is a single undo step
- Fixed component IDs not advancing past autosaved projects on reload, which could let a new component collide with a restored one
- Added a **Vitest** test suite (`npm run test`): golden-file snapshots for the YAML generator (one per template) plus a generate→import round-trip

## 0.1.6

- Added **Secondary I2C Bus** component (`misc.i2c_bus`) -- define additional I2C buses with custom SDA/SCL pins; the I2C section is emitted as a list when more than one bus is present, and I2C components gain a "I2C Bus" dropdown to select the target bus (writes `i2c_id:` in the YAML)
- Added **Secondary SPI Bus** component (`misc.spi_bus`) -- same pattern for SPI; SPI components gain an `spi_id:` selector when a secondary bus is present
- Added **On Value** automation trigger -- fires every time a sensor reports a new reading; embedded as `on_value:` inside the sensor entry
- Added **Time Schedule** automation trigger -- fires at specific hours/minutes/seconds (optionally filtered to certain days of the week); embedded as `on_time:` inside the `time:` section; requires Time (SNTP) enabled in Settings
- Added **Substitutions** block -- add key-value pairs in Settings; emitted as the `substitutions:` block at the top of the YAML (reference with `${key}`); substitutions are preserved on import/export round-trips

## 0.1.5

- Added **Flash** button to the YAML preview panel — copies configuration to clipboard and opens web.esphome.io in one click
- Added stricter field validation: number fields are checked for valid values, percentage fields enforced to 0–100, I2C addresses validated to the 7-bit range (0–127), and cross-field checks for min/max pairs (value, temperature, length)
- Added device name format validation — catches spaces and special characters that ESPHome does not allow in device names

## 0.1.4

- Added **Custom Board** option as the first board in the selector - enter any ESPHome board ID, platform, and ESP32 variant manually
- Added **OpenThread** component (Thread mesh networking) for ESP32-C5, C6, and H2 boards; generates `network: enable_ipv6`, `openthread:` section, and skips WiFi/captive_portal automatically
- Added **variant-aware component filtering** (`variantFilter`): components that require specific ESP32 hardware are hidden when an incompatible variant is selected
  - OpenThread: ESP32-C5, C6, H2 only (Thread radio required)
  - ESP32 Touch Pad: ESP32, S2, S3 only (capacitive touch hardware required)
- Added `esp32c5` to supported board variants
- Added `Network` icon to icon set

## 0.1.3

- Removed XIAO ESP32-S2 board (does not exist in the Seeed XIAO lineup)
- Fixed T-Display S3 Pro description: 2.33" display, camera POGO expansion, dual QWIIC ports
- Fixed AtomS3 Grove PORT.CUSTOM I2C: G2/G1 (was G38/G39)
- Fixed Cardputer Grove PORT.CUSTOM I2C: G2/G1 (was G13/G15)
- Fixed M5Stack Dial PORT.A: G13/G15; PORT.B: GPIO G2/G1 (was wrong order and mislabeled as UART)
- Fixed StickC Plus2: removed AXP2101 PMU (not present); I2C corrected to G32/G33 (HY2.0 port)
- Fixed T-Watch S3: removed MPU6050 default component (board has BMA423, no ESPHome support)
- Fixed XIAO ESP32C6: D3 pin corrected to GPIO21; SPI pin order corrected
- Fixed T-Beam v1.1: removed NeoPixel (not on board); GPIO38 is user button; LoRa CS corrected to GPIO18
- Fixed T-Beam Supreme: GPS pins corrected to GPIO8/9 (was 4/5 which are LoRa BUSY/RESET); OLED is SH1106; added L76K GPS variant
- Fixed M5Stack CoreS3: Grove PORT.A I2C corrected to G2/G1 (was G12/G11 which is the internal camera SCCB bus)
- Fixed `lock.gpio` component: platform corrected from `gpio` to `output` (gpio platform does not exist for ESPHome locks)
- Fixed `sensor.ntc` component: config key corrected from `sensor_id` to `sensor`
- Removed `sensor.ld2411s` component (LD2411S has no official ESPHome support)
- Board count updated to 41; component count updated to 98

## 0.1.2

- Fixed header layout in Home Assistant (tabs now always in their own row below the header bar)
- Board badge and project name hide at narrow widths to prevent overflow
- Mobile breakpoint lowered to 900px to better handle HA sidebar viewport

## 0.1.1

- Added IR/RF Proxy template and component for universal IR remote control via Home Assistant
- Status LED pin field changed to a board-aware dropdown
- Board selector search no longer auto-focuses on page load
- Board grouping cleaned up: LilyGO, Seeed XIAO, M5Stack, LOLIN, and Sonoff now have dedicated sections
- Validation warning when IR/RF Proxy is added without a transmitter or receiver
- Updated favicon to ESPForge chip icon
- Fixed `carrier_duty_percent` format to include `%` suffix

## 0.1.0

- Initial release
