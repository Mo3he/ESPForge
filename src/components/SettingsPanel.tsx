import { useProject } from '../context/ProjectContext';

function generateBase64Key(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

function generatePassword(length = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export default function SettingsPanel() {
  const { project, dispatch } = useProject();
  const s = project.settings;

  const update = (patch: Partial<typeof s>) => {
    dispatch({ type: 'UPDATE_SETTINGS', settings: patch });
  };

  return (
    <div className="settings-panel">
      <h2>Project Settings</h2>

      <fieldset className="config-fieldset">
        <legend>Device</legend>
        <div className="form-group">
          <label>Device Name <span className="required">*</span></label>
          <input
            type="text"
            value={s.name}
            placeholder="my-esp-device"
            onChange={(e) => update({ name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
          />
          <span className="form-hint">Lowercase, hyphens only. Used as hostname.</span>
        </div>
        <div className="form-group">
          <label>Friendly Name</label>
          <input
            type="text"
            value={s.friendlyName}
            placeholder="My ESP Device"
            onChange={(e) => update({ friendlyName: e.target.value })}
          />
        </div>
        {project.board?.platform === 'esp32' && (
          <div className="form-group">
            <label>Framework</label>
            <select value={s.espFramework} onChange={(e) => update({ espFramework: e.target.value as 'arduino' | 'esp-idf', _rawPlatformExtras: undefined })}>
              <option value="arduino">Arduino</option>
              <option value="esp-idf">ESP-IDF</option>
            </select>
          </div>
        )}
      </fieldset>

      <fieldset className="config-fieldset">
        <legend>WiFi</legend>
        <div className="form-group">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={s.useSecretsWifi}
              onChange={(e) => update({ useSecretsWifi: e.target.checked })}
            />
            <span className="toggle-text">Use !secret for WiFi credentials</span>
          </label>
        </div>
        <div className="form-group">
          <label>SSID</label>
          <input
            type="text"
            value={s.wifiSsid}
            placeholder="MyWiFi"
            onChange={(e) => update({ wifiSsid: e.target.value })}
          />
          {s.useSecretsWifi && <span className="form-hint">Stored in secrets.yaml as <code>wifi_ssid</code>.</span>}
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={s.wifiPassword}
            placeholder="••••••••"
            onChange={(e) => update({ wifiPassword: e.target.value })}
          />
          {s.useSecretsWifi && <span className="form-hint">Stored in secrets.yaml as <code>wifi_password</code>.</span>}
        </div>
        <div className="form-group">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={s.fallbackApEnabled}
              onChange={(e) => update({ fallbackApEnabled: e.target.checked })}
            />
            <span className="toggle-text">Fallback Access Point</span>
          </label>
        </div>
        {s.fallbackApEnabled && (
          <>
            <div className="form-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={s.useSecretsFallbackApSsid && s.useSecretsFallbackApPassword}
                  onChange={(e) => update({ useSecretsFallbackApSsid: e.target.checked, useSecretsFallbackApPassword: e.target.checked })}
                />
                <span className="toggle-text">Use secrets.yaml</span>
              </label>
            </div>
            <div className="form-group">
              <label>AP Name</label>
              <input
                type="text"
                value={s.fallbackApSsid}
                placeholder={`${s.friendlyName} Fallback`}
                onChange={(e) => update({ fallbackApSsid: e.target.value })}
              />
              {s.useSecretsFallbackApSsid && <span className="form-hint">Stored in secrets.yaml as <code>fallback_ap_ssid</code>.</span>}
            </div>
            <div className="form-group">
              <label>AP Password</label>
              <input
                type="text"
                value={s.fallbackApPassword}
                placeholder="fallback123"
                onChange={(e) => update({ fallbackApPassword: e.target.value })}
              />
              {s.useSecretsFallbackApPassword && <span className="form-hint">Stored in secrets.yaml as <code>fallback_ap_password</code>.</span>}
            </div>
          </>
        )}
        <div className="form-group">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={s.captivePortalEnabled}
              onChange={(e) => update({ captivePortalEnabled: e.target.checked })}
            />
            <span className="toggle-text">Captive Portal</span>
          </label>
        </div>
        <div className="form-group">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={s.staticIpEnabled}
              onChange={(e) => update({ staticIpEnabled: e.target.checked })}
            />
            <span className="toggle-text">Static IP</span>
          </label>
        </div>
        {s.staticIpEnabled && (
          <>
            <div className="form-group">
              <label>IP Address</label>
              <input type="text" value={s.staticIp} placeholder="192.168.1.50" onChange={(e) => update({ staticIp: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Gateway</label>
              <input type="text" value={s.gateway} placeholder="192.168.1.1" onChange={(e) => update({ gateway: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Subnet</label>
              <input type="text" value={s.subnet} placeholder="255.255.255.0" onChange={(e) => update({ subnet: e.target.value })} />
            </div>
            <div className="form-group">
              <label>DNS (optional)</label>
              <input type="text" value={s.dns} placeholder="8.8.8.8" onChange={(e) => update({ dns: e.target.value })} />
            </div>
          </>
        )}
      </fieldset>

      <fieldset className="config-fieldset">
        <legend>Services</legend>
        <div className="form-group">
          <label className="toggle-label">
            <input type="checkbox" checked={s.loggerEnabled} onChange={(e) => update({ loggerEnabled: e.target.checked })} />
            <span className="toggle-text">Logger</span>
          </label>
        </div>
        {s.loggerEnabled && (
          <div className="form-group">
            <label>Log Level</label>
            <select value={s.loggerLevel} onChange={(e) => update({ loggerLevel: e.target.value })}>
              <option value="NONE">NONE</option>
              <option value="ERROR">ERROR</option>
              <option value="WARN">WARN</option>
              <option value="INFO">INFO</option>
              <option value="DEBUG">DEBUG</option>
              <option value="VERBOSE">VERBOSE</option>
              <option value="VERY_VERBOSE">VERY_VERBOSE</option>
            </select>
          </div>
        )}
        <div className="form-group">
          <label className="toggle-label">
            <input type="checkbox" checked={s.apiEnabled} onChange={(e) => update({ apiEnabled: e.target.checked })} />
            <span className="toggle-text">Home Assistant API</span>
          </label>
        </div>
        {s.apiEnabled && (
          <>
            <div className="form-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={s.useSecretsApi}
                  onChange={(e) => update({ useSecretsApi: e.target.checked })}
                />
                <span className="toggle-text">Use !secret for API key</span>
              </label>
            </div>
            <div className="form-group">
              <label>Encryption Key</label>
              <div className="input-with-btn">
                <input type="text" value={s.apiKey} placeholder="Base64 key" onChange={(e) => update({ apiKey: e.target.value })} />
                <button className="btn btn-sm" onClick={() => update({ apiKey: generateBase64Key() })} title="Generate random key">🔑 Generate</button>
              </div>
              {s.useSecretsApi
                ? <span className="form-hint">Stored in secrets.yaml as <code>api_key</code>.</span>
                : <span className="form-hint">32-byte Base64-encoded key for API encryption.</span>}
            </div>
          </>
        )}
        <div className="form-group">
          <label className="toggle-label">
            <input type="checkbox" checked={s.otaEnabled} onChange={(e) => update({ otaEnabled: e.target.checked })} />
            <span className="toggle-text">OTA Updates</span>
          </label>
        </div>
        {s.otaEnabled && (
          <>
            <div className="form-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={s.useSecretsOta}
                  onChange={(e) => update({ useSecretsOta: e.target.checked })}
                />
                <span className="toggle-text">Use !secret for OTA password</span>
              </label>
            </div>
            <div className="form-group">
              <label>OTA Password</label>
              <div className="input-with-btn">
                <input type="text" value={s.otaPassword} placeholder="Password" onChange={(e) => update({ otaPassword: e.target.value })} />
                <button className="btn btn-sm" onClick={() => update({ otaPassword: generatePassword() })} title="Generate random password">🔑 Generate</button>
              </div>
              {s.useSecretsOta && <span className="form-hint">Stored in secrets.yaml as <code>ota_password</code>.</span>}
            </div>
          </>
        )}
        <div className="form-group">
          <label className="toggle-label">
            <input type="checkbox" checked={s.webServerEnabled} onChange={(e) => update({ webServerEnabled: e.target.checked })} />
            <span className="toggle-text">Web Server</span>
          </label>
        </div>
        {s.webServerEnabled && (
          <div className="form-group">
            <label>Port</label>
            <input type="number" value={s.webServerPort} onChange={(e) => update({ webServerPort: Number(e.target.value) })} />
          </div>
        )}
      </fieldset>

      <fieldset className="config-fieldset">
        <legend>MQTT</legend>
        <div className="form-group">
          <label className="toggle-label">
            <input type="checkbox" checked={s.mqttEnabled} onChange={(e) => update({ mqttEnabled: e.target.checked })} />
            <span className="toggle-text">Enable MQTT</span>
          </label>
        </div>
        {s.mqttEnabled && (
          <>
            <div className="form-group">
              <label>Broker</label>
              <input type="text" value={s.mqttBroker} placeholder="192.168.1.100" onChange={(e) => update({ mqttBroker: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Port</label>
              <input type="number" value={s.mqttPort} onChange={(e) => update({ mqttPort: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={s.useSecretsMqtt}
                  onChange={(e) => update({ useSecretsMqtt: e.target.checked })}
                />
                <span className="toggle-text">Use !secret for credentials</span>
              </label>
            </div>
            <div className="form-group">
              <label>Username</label>
              <input type="text" value={s.mqttUsername} onChange={(e) => update({ mqttUsername: e.target.value })} />
              {s.useSecretsMqtt && <span className="form-hint">Stored in secrets.yaml as <code>mqtt_username</code>.</span>}
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={s.mqttPassword} onChange={(e) => update({ mqttPassword: e.target.value })} />
              {s.useSecretsMqtt && <span className="form-hint">Stored in secrets.yaml as <code>mqtt_password</code>.</span>}
            </div>
          </>
        )}
      </fieldset>

      <fieldset className="config-fieldset">
        <legend>Advanced</legend>
        <div className="form-group">
          <label>Status LED Pin</label>
          <input type="text" value={s.statusLedPin} placeholder="GPIO2 (leave empty to disable)" onChange={(e) => update({ statusLedPin: e.target.value })} />
          <span className="form-hint">Built-in LED that blinks to show device status.</span>
        </div>
        <div className="form-group">
          <label className="toggle-label">
            <input type="checkbox" checked={s.timeEnabled} onChange={(e) => update({ timeEnabled: e.target.checked })} />
            <span className="toggle-text">SNTP Time Sync</span>
          </label>
        </div>
        {s.timeEnabled && (
          <>
            <div className="form-group">
              <label>Timezone</label>
              <select value={s.timeTimezone} onChange={(e) => update({ timeTimezone: e.target.value })}>
                <option value="">None</option>
                <optgroup label="Europe">
                  <option value="Europe/London">Europe/London</option>
                  <option value="Europe/Paris">Europe/Paris</option>
                  <option value="Europe/Berlin">Europe/Berlin</option>
                  <option value="Europe/Madrid">Europe/Madrid</option>
                  <option value="Europe/Rome">Europe/Rome</option>
                  <option value="Europe/Amsterdam">Europe/Amsterdam</option>
                  <option value="Europe/Brussels">Europe/Brussels</option>
                  <option value="Europe/Vienna">Europe/Vienna</option>
                  <option value="Europe/Warsaw">Europe/Warsaw</option>
                  <option value="Europe/Stockholm">Europe/Stockholm</option>
                  <option value="Europe/Oslo">Europe/Oslo</option>
                  <option value="Europe/Copenhagen">Europe/Copenhagen</option>
                  <option value="Europe/Helsinki">Europe/Helsinki</option>
                  <option value="Europe/Athens">Europe/Athens</option>
                  <option value="Europe/Bucharest">Europe/Bucharest</option>
                  <option value="Europe/Istanbul">Europe/Istanbul</option>
                  <option value="Europe/Moscow">Europe/Moscow</option>
                  <option value="Europe/Lisbon">Europe/Lisbon</option>
                  <option value="Europe/Dublin">Europe/Dublin</option>
                  <option value="Europe/Zurich">Europe/Zurich</option>
                  <option value="Europe/Prague">Europe/Prague</option>
                  <option value="Europe/Budapest">Europe/Budapest</option>
                </optgroup>
                <optgroup label="Americas">
                  <option value="America/New_York">America/New_York (ET)</option>
                  <option value="America/Chicago">America/Chicago (CT)</option>
                  <option value="America/Denver">America/Denver (MT)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PT)</option>
                  <option value="America/Anchorage">America/Anchorage (AKT)</option>
                  <option value="Pacific/Honolulu">Pacific/Honolulu (HT)</option>
                  <option value="America/Toronto">America/Toronto</option>
                  <option value="America/Vancouver">America/Vancouver</option>
                  <option value="America/Mexico_City">America/Mexico_City</option>
                  <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                  <option value="America/Argentina/Buenos_Aires">America/Buenos_Aires</option>
                  <option value="America/Bogota">America/Bogota</option>
                  <option value="America/Lima">America/Lima</option>
                  <option value="America/Santiago">America/Santiago</option>
                  <option value="America/Caracas">America/Caracas</option>
                </optgroup>
                <optgroup label="Asia / Pacific">
                  <option value="Asia/Dubai">Asia/Dubai</option>
                  <option value="Asia/Kolkata">Asia/Kolkata</option>
                  <option value="Asia/Dhaka">Asia/Dhaka</option>
                  <option value="Asia/Bangkok">Asia/Bangkok</option>
                  <option value="Asia/Singapore">Asia/Singapore</option>
                  <option value="Asia/Shanghai">Asia/Shanghai</option>
                  <option value="Asia/Tokyo">Asia/Tokyo</option>
                  <option value="Asia/Seoul">Asia/Seoul</option>
                  <option value="Asia/Jakarta">Asia/Jakarta</option>
                  <option value="Asia/Karachi">Asia/Karachi</option>
                  <option value="Asia/Riyadh">Asia/Riyadh</option>
                  <option value="Asia/Jerusalem">Asia/Jerusalem</option>
                  <option value="Asia/Taipei">Asia/Taipei</option>
                  <option value="Asia/Hong_Kong">Asia/Hong_Kong</option>
                  <option value="Australia/Sydney">Australia/Sydney</option>
                  <option value="Australia/Melbourne">Australia/Melbourne</option>
                  <option value="Australia/Brisbane">Australia/Brisbane</option>
                  <option value="Australia/Perth">Australia/Perth</option>
                  <option value="Pacific/Auckland">Pacific/Auckland</option>
                </optgroup>
                <optgroup label="Africa">
                  <option value="Africa/Cairo">Africa/Cairo</option>
                  <option value="Africa/Johannesburg">Africa/Johannesburg</option>
                  <option value="Africa/Lagos">Africa/Lagos</option>
                  <option value="Africa/Nairobi">Africa/Nairobi</option>
                  <option value="Africa/Casablanca">Africa/Casablanca</option>
                </optgroup>
              </select>
            </div>
            <div className="form-group">
              <label>NTP Servers</label>
              <input
                type="text"
                value={s.timeServers}
                placeholder="pool.ntp.org, time.google.com (comma-separated)"
                onChange={(e) => update({ timeServers: e.target.value })}
              />
              <span className="form-hint">Leave empty to use ESPHome defaults.</span>
            </div>
          </>
        )}
      </fieldset>

      {/* Change board */}
      <fieldset className="config-fieldset">
        <legend>Project</legend>
        <button
          className="btn btn-danger"
          onClick={() => {
            if (confirm('This will reset all components and automations. Continue?')) {
              dispatch({ type: 'RESET_PROJECT' });
            }
          }}
        >
          Reset Project
        </button>
      </fieldset>
    </div>
  );
}
