const GE_DRYER_CARD_VERSION = '1.5.0';
console.log(`GE Dryer Card v${GE_DRYER_CARD_VERSION}: loading...`);

class GeDryerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = null;
  }

  setConfig(config) {
    if (!config.prefix) {
      throw new Error('You need to define a "prefix" (e.g. "sensor.hasvr1_ge_dryer_laundry")');
    }
    this._config = {
      prefix: config.prefix.replace(/\/$/, ''),
      name: config.name || 'GE Dryer',
      sheets: config.sheets !== false,
    };
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() { return 7; }
  static getConfigElement() { return null; }
  static getStubConfig() {
    return { prefix: 'sensor.hasvr1_ge_dryer_laundry', name: 'GE Dryer' };
  }

  _getState(suffix) {
    if (!this._hass) return null;
    const entity = this._hass.states[`${this._config.prefix}_${suffix}`];
    if (entity) return entity.state;
    // Handle the inconsistent tumble_status entity naming
    const alt = this._hass.states[`${this._config.prefix.replace('_laundry', 'laundry')}_${suffix}`];
    return alt ? alt.state : null;
  }

  _getBinary(suffix) {
    if (!this._hass) return null;
    const binaryId = this._config.prefix.replace('sensor.', 'binary_sensor.') + '_' + suffix;
    const entity = this._hass.states[binaryId];
    return entity ? entity.state : null;
  }

  _tempColor(tempLevel) {
    const map = {
      'no heat':    { color: '#4488bb', glow: 'rgba(68,136,187,0.4)' },
      'air fluff':  { color: '#4488bb', glow: 'rgba(68,136,187,0.4)' },
      'extra low':  { color: '#55aacc', glow: 'rgba(85,170,204,0.4)' },
      'low':        { color: '#66bbaa', glow: 'rgba(102,187,170,0.4)' },
      'medium low': { color: '#cc9922', glow: 'rgba(204,153,34,0.5)' },
      'medium':     { color: '#ee8811', glow: 'rgba(238,136,17,0.5)' },
      'high':       { color: '#ff6600', glow: 'rgba(255,102,0,0.6)' },
      'extra high': { color: '#ff3300', glow: 'rgba(255,51,0,0.6)' },
    };
    return map[(tempLevel || '').toLowerCase()] || { color: '#555', glow: 'rgba(85,85,85,0.2)' };
  }

  _formatTime(seconds) {
    const s = parseFloat(seconds);
    if (!s || s <= 0) return '--';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  _render() {
    if (!this._hass || !this._config) return;

    const machineState = this._getState('machine_state') || 'Off';
    const cycle = this._getState('cycle') || '--';
    const subCycle = this._getState('sub_cycle') || '---';
    const timeRemaining = this._getState('time_remaining');
    const delayRemaining = this._getState('delay_time_remaining');
    const tempOption = this._getState('dryer_temperaturenew_option') || '--';
    const drynessLevel = this._getState('dryer_drynessnew_level') || '--';
    const ecoDry = this._getState('dryer_ecodry_option_selection') || '--';
    const extTumble = this._getState('dryer_extended_tumble_option_selection') || '--';
    const sheetInventory = this._getState('dryer_sheet_inventory');
    const sheetConfig = this._getState('dryer_sheet_usage_configuration') || '--';
    const tumbleStatus = this._getState('dryer_tumble_status') || '--';

    // Binary sensors
    const doorOpen = this._getBinary('door') === 'on';
    const ventBlocked = this._getBinary('dryer_blocked_vent_fault') === 'on';
    const washerLink = this._getBinary('dryer_washerlink_status') === 'on';

    const isActive = machineState.toLowerCase() !== 'off';
    const isDelay = delayRemaining && parseFloat(delayRemaining) > 0;
    const isSteam = cycle.toLowerCase().includes('steam') || subCycle.toLowerCase().includes('steam');
    const tc = this._tempColor(tempOption);
    const name = this._config.name;

    // Drum spins when active
    const drumAnim = isActive ? 'drumSpin 4s linear infinite' : 'none';

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card {
          background: linear-gradient(175deg, #1a1a1e 0%, #0d0d10 100%);
          border: 1px solid #2a2a30; border-radius: 16px; overflow: hidden;
          font-family: 'Segoe UI', Roboto, sans-serif; color: #e0e0e0; padding: 0;
        }
        .body { padding: 16px 16px 10px; }

        /* Top bar */
        .top-bar {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px;
        }
        .brand { font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #888; }
        .name { font-size: 13px; font-weight: 500; color: #aaa; }

        /* LCD */
        .lcd-bezel {
          background: #050508; border: 2px solid #333; border-radius: 8px;
          padding: 3px; margin-bottom: 14px;
          box-shadow: inset 0 2px 8px rgba(0,0,0,0.8);
        }
        .lcd-screen {
          background: linear-gradient(180deg, #080a1a 0%, #0d1025 50%, #080a1a 100%);
          border-radius: 5px; padding: 12px 16px; position: relative; overflow: hidden;
          min-height: 70px; display: flex; flex-direction: column; justify-content: center;
        }
        .lcd-screen.active {
          background: linear-gradient(180deg, #080a1a 0%, #101830 50%, #080a1a 100%);
        }
        .lcd-screen::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px);
          pointer-events: none; z-index: 1;
        }
        .lcd-row { display: flex; align-items: baseline; justify-content: space-between; position: relative; z-index: 2; }
        .lcd-row.main { margin-bottom: 4px; }
        .lcd-cycle {
          font-family: 'Courier New', monospace; font-size: 28px; font-weight: 700;
          color: #66bbff; text-shadow: 0 0 12px rgba(102,187,255,0.6);
          line-height: 1; letter-spacing: 1px; text-transform: uppercase;
        }
        .lcd-cycle.off { color: #5599cc; text-shadow: 0 0 8px rgba(85,153,204,0.4); }
        .lcd-time {
          font-family: 'Courier New', monospace; font-size: 22px;
          color: #55aaee; text-shadow: 0 0 8px rgba(85,170,238,0.4); opacity: 0.9;
        }
        .lcd-sub {
          font-family: 'Courier New', monospace; font-size: 14px;
          color: #5599dd; text-shadow: 0 0 6px rgba(85,153,221,0.4);
          text-transform: uppercase; letter-spacing: 1px;
        }
        .lcd-sub.off { color: #6699cc; text-shadow: 0 0 6px rgba(102,153,204,0.4); }
        .lcd-state {
          font-family: 'Courier New', monospace; font-size: 12px;
          color: #55aaee; text-shadow: 0 0 4px rgba(85,170,238,0.4);
        }

        /* Machine body */
        .machine-body {
          border: 2px solid #3a3a40; border-radius: 14px;
          padding: 12px; margin-bottom: 8px;
          background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.1) 100%);
          display: flex; flex-direction: column; align-items: center;
        }

        /* Drum container */
        .drum-container {
          position: relative; width: 200px; height: 200px; margin: 8px 0;
        }
        .door-ring {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          border-radius: 50%;
          background: conic-gradient(from 0deg, #555, #777, #999, #888, #666, #555);
          box-shadow: 0 4px 12px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.3);
        }
        .door-glass {
          position: absolute; top: 8px; left: 8px; right: 8px; bottom: 8px;
          border-radius: 50%;
          background: radial-gradient(circle, #1a1a1e 0%, #0d0d10 100%);
          box-shadow: inset 0 4px 16px rgba(0,0,0,0.6);
          overflow: hidden;
        }
        .door-glass.active {
          background: radial-gradient(circle at 40% 40%, ${tc.color}22 0%, ${tc.color}11 40%, #0d0d10 100%);
          box-shadow: inset 0 0 40px ${tc.glow}, inset 0 4px 16px rgba(0,0,0,0.4);
        }

        /* Drum with wall-mounted lifter bars */
        .drum-inner {
          position: absolute; top: 16px; left: 16px; right: 16px; bottom: 16px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.08);
          animation: ${drumAnim};
        }
        /* Lifter bars — short radial fins mounted on the drum wall */
        .lifter {
          position: absolute;
          top: 50%; left: 50%;
          width: 6px; height: 20px;
          margin-left: -3px;
          margin-top: -74px; /* near the drum wall (radius ~76px, 2px gap) */
          transform-origin: 3px 74px; /* rotate around drum center */
          background: linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.06) 100%);
          border-radius: 3px;
        }
        .lifter.active {
          background: linear-gradient(180deg, ${tc.color}55 0%, ${tc.color}22 100%);
        }
        .lifter:nth-child(1) { transform: rotate(0deg); }
        .lifter:nth-child(2) { transform: rotate(90deg); }
        .lifter:nth-child(3) { transform: rotate(180deg); }
        .lifter:nth-child(4) { transform: rotate(270deg); }

        .perf-ring {
          position: absolute; top: 16px; left: 16px; right: 16px; bottom: 16px;
          border-radius: 50%; border: 1px dashed rgba(255,255,255,0.06);
        }

        @keyframes drumSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Temperature glow ring */
        .glow-ring {
          position: absolute; top: 4px; left: 4px; right: 4px; bottom: 4px;
          border-radius: 50%; border: 2px solid transparent; display: none;
        }
        .glow-ring.active {
          display: block;
          border-color: ${tc.color}66;
          box-shadow: 0 0 15px ${tc.glow}, inset 0 0 15px ${tc.glow};
          animation: glowPulse 3s ease-in-out infinite;
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        /* Steam effect */
        .steam-container {
          position: absolute; top: 15%; left: 30%; width: 40%; height: 50%;
          display: ${isSteam && isActive ? 'block' : 'none'};
          pointer-events: none;
        }
        .steam-wisp {
          position: absolute; bottom: 0; width: 3px;
          background: linear-gradient(to top, transparent, rgba(200,220,255,0.3), transparent);
          border-radius: 50%;
          animation: steamRise 2s ease-out infinite;
        }
        .steam-wisp:nth-child(1) { left: 20%; height: 30px; animation-delay: 0s; }
        .steam-wisp:nth-child(2) { left: 45%; height: 25px; animation-delay: 0.5s; }
        .steam-wisp:nth-child(3) { left: 70%; height: 35px; animation-delay: 1s; }
        .steam-wisp:nth-child(4) { left: 35%; height: 20px; animation-delay: 1.5s; }
        .steam-wisp:nth-child(5) { left: 60%; height: 28px; animation-delay: 0.8s; }
        @keyframes steamRise {
          0% { opacity: 0; transform: translateY(0) scaleX(1); }
          30% { opacity: 0.6; }
          70% { opacity: 0.3; transform: translateY(-30px) scaleX(1.8); }
          100% { opacity: 0; transform: translateY(-50px) scaleX(2.5); }
        }

        /* Door handle */
        .door-handle {
          position: absolute; top: 50%; right: -14px; transform: translateY(-50%);
          width: 10px; height: 50px; border-radius: 5px;
          background: linear-gradient(90deg, #666 0%, #444 50%, #555 100%);
          box-shadow: 2px 2px 4px rgba(0,0,0,0.4);
        }

        /* Door/vent status icons */
        .door-icons {
          position: absolute; bottom: 12px; right: 12px;
          display: flex; gap: 6px; z-index: 5;
        }
        .door-icon {
          font-size: 14px; opacity: 0.4;
        }
        .door-icon.open { opacity: 1; color: #ffaa33; }

        /* Vent warning */
        .vent-warning {
          display: flex; align-items: center; gap: 6px;
          background: rgba(255, 50, 50, 0.15); border: 1px solid rgba(255, 50, 50, 0.3);
          border-radius: 8px; padding: 6px 10px; margin-bottom: 8px;
          font-size: 12px; color: #ff6644;
        }
        .vent-warning-icon { font-size: 16px; }
        @keyframes ventPulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        .vent-warning { animation: ventPulse 2s ease-in-out infinite; }

        /* Sensor grid */
        .sensor-grid {
          display: grid; grid-template-columns: 1fr 1fr 1fr;
          gap: 4px; width: 100%; margin-top: 8px;
        }
        .sensor-item {
          background: rgba(255,255,255,0.04); border-radius: 6px;
          padding: 4px 6px; display: flex; flex-direction: column;
        }
        .sensor-label {
          font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px;
          color: #999; margin-bottom: 1px;
        }
        .sensor-value { font-size: 11px; font-weight: 500; color: #e0e0e0; }
        .sensor-value.highlight { color: ${tc.color}; }

        /* Footer */
        .footer {
          margin-top: 4px; padding: 4px 4px 0;
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex; justify-content: space-between; align-items: center;
        }
        .entity-id { font-size: 9px; color: #444; font-family: monospace; }
      </style>

      <ha-card>
        <div class="body">
          <div class="top-bar">
            <span class="brand">GE Profile</span>
            <span class="name">${name}</span>
          </div>

          <div class="lcd-bezel">
            <div class="lcd-screen ${isActive ? 'active' : ''}">
              <div class="lcd-row main">
                <span class="lcd-cycle ${isActive ? '' : 'off'}">${isDelay ? 'DELAY' : (isActive ? cycle : 'OFF')}</span>
                ${isDelay ? `<span class="lcd-time">${this._formatTime(delayRemaining)}</span>` : (isActive && timeRemaining ? `<span class="lcd-time">${this._formatTime(timeRemaining)}</span>` : '')}
              </div>
              <div class="lcd-row">
                <span class="lcd-sub ${isActive ? '' : 'off'}">${isActive ? (subCycle !== '---' ? subCycle : machineState) : machineState}</span>
                ${isActive ? `<span class="lcd-state">${tempOption}</span>` : ''}
              </div>
            </div>
          </div>

          ${ventBlocked ? '<div class="vent-warning"><span class="vent-warning-icon">⚠️</span> Blocked Vent Detected</div>' : ''}
          <div class="machine-body">
            <div class="drum-container">
              <div class="door-ring"></div>
              <div class="glow-ring ${isActive ? 'active' : ''}"></div>
              <div class="door-glass ${isActive ? 'active' : ''}">
                <div class="steam-container">
                  <div class="steam-wisp"></div>
                  <div class="steam-wisp"></div>
                  <div class="steam-wisp"></div>
                  <div class="steam-wisp"></div>
                  <div class="steam-wisp"></div>
                </div>
                <div class="drum-inner">
                  <div class="perf-ring"></div>
                  <div class="lifter ${isActive ? 'active' : ''}"></div>
                  <div class="lifter ${isActive ? 'active' : ''}"></div>
                  <div class="lifter ${isActive ? 'active' : ''}"></div>
                  <div class="lifter ${isActive ? 'active' : ''}"></div>
                </div>
              </div>
              <div class="door-handle"></div>
              <div class="door-icons">
                ${doorOpen ? '<span class="door-icon open" title="Door Open">🚪</span>' : ''}
              </div>
            </div>

            <div class="sensor-grid">
              <div class="sensor-item">
                <span class="sensor-label">Heat</span>
                <span class="sensor-value ${isActive ? 'highlight' : ''}">${tempOption}</span>
              </div>
              <div class="sensor-item">
                <span class="sensor-label">Dryness</span>
                <span class="sensor-value">${drynessLevel}</span>
              </div>
              ${this._config.sheets ? `<div class="sensor-item">
                <span class="sensor-label">Sheets</span>
                <span class="sensor-value">${sheetInventory != null && sheetInventory !== '0' ? sheetInventory : '--'}</span>
              </div>` : `<div class="sensor-item">
                <span class="sensor-label">WasherLink</span>
                <span class="sensor-value ${washerLink ? 'highlight' : ''}">${washerLink ? 'Linked' : 'Off'}</span>
              </div>`}
              <div class="sensor-item">
                <span class="sensor-label">Eco Dry</span>
                <span class="sensor-value ${ecoDry.toLowerCase() !== 'disabled' ? 'highlight' : ''}">${ecoDry.toLowerCase() !== 'disabled' ? 'On' : 'Off'}</span>
              </div>
              <div class="sensor-item">
                <span class="sensor-label">Ext Tumble</span>
                <span class="sensor-value ${extTumble.toLowerCase() !== 'disable' && extTumble.toLowerCase() !== 'disabled' ? 'highlight' : ''}">${extTumble.toLowerCase() !== 'disable' && extTumble.toLowerCase() !== 'disabled' ? 'On' : 'Off'}</span>
              </div>
              <div class="sensor-item">
                <span class="sensor-label">${isSteam ? 'Steam' : 'Tumble'}</span>
                <span class="sensor-value ${isSteam ? 'highlight' : (tumbleStatus.toLowerCase() !== 'disable' && tumbleStatus.toLowerCase() !== 'disabled' ? 'highlight' : '')}">${isSteam ? 'On' : (tumbleStatus.toLowerCase() !== 'disable' && tumbleStatus.toLowerCase() !== 'disabled' ? 'On' : 'Off')}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <span class="entity-id">${this._config.prefix}</span>
            <span class="entity-id">v${GE_DRYER_CARD_VERSION}</span>
          </div>
        </div>
      </ha-card>
    `;
  }
}

customElements.define('ge-dryer-card', GeDryerCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'ge-dryer-card',
  name: 'GE Dryer Card',
  description: 'Status card for GE Profile dryers via SmartHQ',
  preview: true,
});
console.log(`GE Dryer Card v${GE_DRYER_CARD_VERSION}: registered.`);
