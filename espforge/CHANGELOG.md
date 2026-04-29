# Changelog

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
