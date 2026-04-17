const GE_DRYER_CARD_VERSION = '1.7.0';
console.log(`GE Dryer Card v${GE_DRYER_CARD_VERSION}: loading...`);

class GeDryerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = null;
    this._rendered = false;
  }

  setConfig(config) {
    if (!config.prefix) {
      throw new Error('You need to define a "prefix" (e.g. "sensor.hasvr1_ge_dryer_laundry")');
    }
    this._config = {
      prefix: config.prefix.replace(/\/$/, ''),
      name: config.name || 'GE Dryer',
      sheets: config.sheets !== false && config.sheets !== 'false',
    };
    this._rendered = false; // force full re-render on config change
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
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

  // Gather all display values from current state
  _getDisplayData() {
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
    const tumbleStatus = this._getState('dryer_tumble_status') || '--';

    // Binary sensors
    const doorOpen = this._getBinary('door') === 'on';
    const ventBlocked = this._getBinary('dryer_blocked_vent_fault') === 'on';
    const washerLink = this._getBinary('dryer_washerlink_status') === 'on';

    const msLower = machineState.toLowerCase();
    const isActive = !['off', 'unavailable', 'unknown'].includes(msLower);
    const isDone = msLower.includes('end') || msLower.includes('complete');
    const isDelay = delayRemaining && parseFloat(delayRemaining) > 0;
    const isSteam = cycle.toLowerCase().includes('steam') || subCycle.toLowerCase().includes('steam');
    const tc = this._tempColor(tempOption);

    // LCD values
    const lcdCycle = isDelay ? 'DELAY' : (isActive ? cycle : 'OFF');
    let lcdTime = '';
    if (isDelay) {
      lcdTime = this._formatTime(delayRemaining);
    } else if (isActive && timeRemaining) {
      lcdTime = this._formatTime(timeRemaining);
    }
    const lcdSub = isActive ? (subCycle !== '---' ? subCycle : machineState) : machineState;

    // Sensor values
    const ecoDryOn = ecoDry.toLowerCase() !== 'disabled';
    const extTumbleOn = extTumble.toLowerCase() !== 'disable' && extTumble.toLowerCase() !== 'disabled';
    const tumbleOn = tumbleStatus.toLowerCase() !== 'disable' && tumbleStatus.toLowerCase() !== 'disabled';

    let sheetsOrLinkLabel, sheetsOrLinkValue, sheetsOrLinkHighlight;
    if (this._config.sheets) {
      sheetsOrLinkLabel = 'Sheets';
      sheetsOrLinkValue = sheetInventory != null && sheetInventory !== '0' ? sheetInventory : '--';
      sheetsOrLinkHighlight = false;
    } else {
      sheetsOrLinkLabel = 'WasherLink';
      sheetsOrLinkValue = washerLink ? 'Linked' : 'Off';
      sheetsOrLinkHighlight = washerLink;
    }

    return {
      isActive, isDone, isDelay, isSteam, tc, doorOpen, ventBlocked,
      lcdCycle, lcdTime, lcdSub, tempOption,
      drynessLevel,
      ecoDryOn, extTumbleOn, tumbleOn, isSteamLabel: isSteam,
      sheetsOrLinkLabel, sheetsOrLinkValue, sheetsOrLinkHighlight,
    };
  }

  // Build initial DOM structure (only once)
  _buildDom() {
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
        /* door-glass active state applied via inline style for dynamic color */

        /* Drum with wall-mounted lifter bars */
        .drum-inner {
          position: absolute; top: 16px; left: 16px; right: 16px; bottom: 16px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .drum-inner.spinning {
          animation: drumSpin 4s linear infinite;
        }
        /* Lifter bars — short radial fins mounted on the drum wall */
        .lifter {
          position: absolute;
          top: 50%; left: 50%;
          width: 6px; height: 20px;
          margin-left: -3px;
          margin-top: -74px;
          transform-origin: 3px 74px;
          background: linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.06) 100%);
          border-radius: 3px;
        }
        /* lifter active state applied via inline style for dynamic color */
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
          animation: glowPulse 3s ease-in-out infinite;
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        /* Steam effect */
        .steam-container {
          position: absolute; top: 15%; left: 30%; width: 40%; height: 50%;
          display: none;
          pointer-events: none;
        }
        .steam-container.visible { display: block; }
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
          position: absolute; top: 50%; left: -14px; transform: translateY(-50%);
          width: 10px; height: 50px; border-radius: 5px;
          background: linear-gradient(90deg, #555 0%, #444 50%, #666 100%);
          box-shadow: -2px 2px 4px rgba(0,0,0,0.4);
        }
        .door-handle.open {
          background: linear-gradient(90deg, #ff9933 0%, #cc7722 50%, #ff9933 100%);
          box-shadow: -2px 2px 4px rgba(0,0,0,0.4), 0 0 8px rgba(255, 153, 51, 0.4);
        }

        /* Vent warning */
        .vent-warning {
          display: none; align-items: center; gap: 6px;
          background: rgba(255, 50, 50, 0.15); border: 1px solid rgba(255, 50, 50, 0.3);
          border-radius: 8px; padding: 6px 10px; margin-bottom: 8px;
          font-size: 12px; color: #ff6644;
          animation: ventPulse 2s ease-in-out infinite;
        }
        .vent-warning.visible { display: flex; }
        .vent-warning-icon { font-size: 16px; }
        @keyframes ventPulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }

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
        .sensor-value.highlight { color: var(--dryer-tc-color, #555); }

        /* DONE badge */
        .lcd-done {
          font-family: 'Courier New', monospace; font-size: 14px; font-weight: 700;
          color: #4caf50; text-shadow: 0 0 8px rgba(76,175,80,0.6);
          letter-spacing: 2px; display: none;
        }
        .lcd-done.visible { display: inline; animation: donePulse 2s ease-in-out infinite; }
        @keyframes donePulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

        /* Footer */
        .footer {
          margin-top: 4px; padding: 4px 4px 0;
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex; justify-content: space-between; align-items: center;
        }
        .entity-id { font-size: 9px; color: #444; font-family: monospace; }

        /* Responsive drum for narrow viewports */
        @media (max-width: 360px) {
          .drum-container { width: min(200px, 55vw); height: min(200px, 55vw); }
        }

        /* Accessibility: reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .drum-inner.spinning, .glow-ring.active, .steam-wisp,
          .vent-warning, .lcd-done.visible {
            animation: none !important;
          }
          .drum-inner.spinning { transform: rotate(45deg); }
          .glow-ring.active { opacity: 0.8; }
        }
      </style>

      <ha-card>
        <div class="body">
          <div class="top-bar">
            <span class="brand">GE Profile</span>
            <span class="name" data-field="name"></span>
          </div>

          <div class="lcd-bezel">
            <div class="lcd-screen" data-field="lcdScreen">
              <div class="lcd-row main">
                <span class="lcd-cycle" data-field="lcdCycle"></span>
                <span class="lcd-time" data-field="lcdTime"></span>
              </div>
              <div class="lcd-row">
                <span class="lcd-sub" data-field="lcdSub"></span>
                <span>
                  <span class="lcd-done" data-field="lcdDone">DONE</span>
                  <span class="lcd-state" data-field="lcdState"></span>
                </span>
              </div>
            </div>
          </div>

          <div class="vent-warning" data-field="ventWarning">
            <span class="vent-warning-icon">\u26a0\ufe0f</span> Blocked Vent Detected
          </div>

          <div class="machine-body">
            <div class="drum-container">
              <div class="door-ring"></div>
              <div class="glow-ring" data-field="glowRing"></div>
              <div class="door-glass" data-field="doorGlass">
                <div class="steam-container" data-field="steamContainer">
                  <div class="steam-wisp"></div>
                  <div class="steam-wisp"></div>
                  <div class="steam-wisp"></div>
                  <div class="steam-wisp"></div>
                  <div class="steam-wisp"></div>
                </div>
                <div class="drum-inner" data-field="drumInner">
                  <div class="perf-ring"></div>
                  <div class="lifter" data-field="lifter0"></div>
                  <div class="lifter" data-field="lifter1"></div>
                  <div class="lifter" data-field="lifter2"></div>
                  <div class="lifter" data-field="lifter3"></div>
                </div>
              </div>
              <div class="door-handle" data-field="doorHandle"></div>
            </div>

            <div class="sensor-grid">
              <div class="sensor-item">
                <span class="sensor-label">Heat</span>
                <span class="sensor-value" data-field="sensorHeat"></span>
              </div>
              <div class="sensor-item">
                <span class="sensor-label">Dryness</span>
                <span class="sensor-value" data-field="sensorDryness"></span>
              </div>
              <div class="sensor-item">
                <span class="sensor-label" data-field="sensorThirdLabel"></span>
                <span class="sensor-value" data-field="sensorThirdValue"></span>
              </div>
              <div class="sensor-item">
                <span class="sensor-label">Eco Dry</span>
                <span class="sensor-value" data-field="sensorEcoDry"></span>
              </div>
              <div class="sensor-item">
                <span class="sensor-label">Ext Tumble</span>
                <span class="sensor-value" data-field="sensorExtTumble"></span>
              </div>
              <div class="sensor-item">
                <span class="sensor-label" data-field="sensorSixthLabel"></span>
                <span class="sensor-value" data-field="sensorSixthValue"></span>
              </div>
            </div>
          </div>

          <div class="footer">
            <span class="entity-id" data-field="footerEntity"></span>
            <span class="entity-id">v${GE_DRYER_CARD_VERSION}</span>
          </div>
        </div>
      </ha-card>
    `;
    this._rendered = true;
  }

  // Get a data-field element
  _el(field) {
    return this.shadowRoot?.querySelector(`[data-field="${field}"]`);
  }

  // Update DOM in-place without replacing innerHTML (preserves animations)
  _update() {
    if (!this._hass || !this._config) return;

    // Build DOM on first render
    if (!this._rendered) {
      this._buildDom();
    }

    const data = this._getDisplayData();

    // Set the dynamic color as a CSS custom property on the host
    const card = this.shadowRoot.querySelector('ha-card');
    if (card) {
      card.style.setProperty('--dryer-tc-color', data.tc.color);
    }

    // Top bar
    this._el('name').textContent = this._config.name;

    // LCD screen
    const lcdScreen = this._el('lcdScreen');
    lcdScreen.className = `lcd-screen ${data.isActive ? 'active' : ''}`;

    const lcdCycle = this._el('lcdCycle');
    lcdCycle.textContent = data.lcdCycle;
    lcdCycle.className = `lcd-cycle ${data.isActive ? '' : 'off'}`;

    const lcdTime = this._el('lcdTime');
    lcdTime.textContent = data.lcdTime;
    lcdTime.style.display = data.lcdTime ? '' : 'none';

    const lcdSub = this._el('lcdSub');
    lcdSub.textContent = data.lcdSub;
    lcdSub.className = `lcd-sub ${data.isActive ? '' : 'off'}`;

    const lcdState = this._el('lcdState');
    lcdState.textContent = data.isActive ? data.tempOption : '';
    lcdState.style.display = data.isActive ? '' : 'none';

    // DONE badge
    this._el('lcdDone').className = `lcd-done ${data.isDone ? 'visible' : ''}`;

    // Vent warning
    this._el('ventWarning').className = `vent-warning ${data.ventBlocked ? 'visible' : ''}`;

    // Glow ring — dynamic color via inline style
    const glowRing = this._el('glowRing');
    if (data.isActive) {
      glowRing.className = 'glow-ring active';
      glowRing.style.borderColor = `${data.tc.color}66`;
      glowRing.style.boxShadow = `0 0 15px ${data.tc.glow}, inset 0 0 15px ${data.tc.glow}`;
    } else {
      glowRing.className = 'glow-ring';
      glowRing.style.borderColor = '';
      glowRing.style.boxShadow = '';
    }

    // Door glass — dynamic background for active state
    const doorGlass = this._el('doorGlass');
    if (data.isActive) {
      doorGlass.style.background = `radial-gradient(circle at 40% 40%, ${data.tc.color}22 0%, ${data.tc.color}11 40%, #0d0d10 100%)`;
      doorGlass.style.boxShadow = `inset 0 0 40px ${data.tc.glow}, inset 0 4px 16px rgba(0,0,0,0.4)`;
    } else {
      doorGlass.style.background = '';
      doorGlass.style.boxShadow = '';
    }

    // Drum spin animation — toggle class instead of rebuilding
    const drumInner = this._el('drumInner');
    if (data.isActive) {
      if (!drumInner.classList.contains('spinning')) drumInner.classList.add('spinning');
    } else {
      drumInner.classList.remove('spinning');
    }

    // Lifter bars — dynamic color via inline style
    for (let i = 0; i < 4; i++) {
      const lifter = this._el(`lifter${i}`);
      if (data.isActive) {
        lifter.style.background = `linear-gradient(180deg, ${data.tc.color}55 0%, ${data.tc.color}22 100%)`;
      } else {
        lifter.style.background = '';
      }
    }

    // Steam container
    this._el('steamContainer').className = `steam-container ${(data.isSteam && data.isActive) ? 'visible' : ''}`;

    // Door handle
    this._el('doorHandle').className = `door-handle ${data.doorOpen ? 'open' : ''}`;

    // Sensor grid
    const sensorHeat = this._el('sensorHeat');
    sensorHeat.textContent = data.tempOption;
    sensorHeat.className = `sensor-value ${data.isActive ? 'highlight' : ''}`;

    this._el('sensorDryness').textContent = data.drynessLevel;

    // Third sensor (sheets or washerlink)
    this._el('sensorThirdLabel').textContent = data.sheetsOrLinkLabel;
    const sensorThirdValue = this._el('sensorThirdValue');
    sensorThirdValue.textContent = data.sheetsOrLinkValue;
    if (data.sheetsOrLinkHighlight) {
      sensorThirdValue.style.color = '#4caf50';
      sensorThirdValue.className = 'sensor-value';
    } else {
      sensorThirdValue.style.color = '';
      sensorThirdValue.className = 'sensor-value';
    }

    const sensorEcoDry = this._el('sensorEcoDry');
    sensorEcoDry.textContent = data.ecoDryOn ? 'On' : 'Off';
    sensorEcoDry.className = `sensor-value ${data.ecoDryOn ? 'highlight' : ''}`;

    const sensorExtTumble = this._el('sensorExtTumble');
    sensorExtTumble.textContent = data.extTumbleOn ? 'On' : 'Off';
    sensorExtTumble.className = `sensor-value ${data.extTumbleOn ? 'highlight' : ''}`;

    // Sixth sensor (steam or tumble)
    this._el('sensorSixthLabel').textContent = data.isSteamLabel ? 'Steam' : 'Tumble';
    const sensorSixthValue = this._el('sensorSixthValue');
    const sixthOn = data.isSteamLabel ? true : data.tumbleOn;
    sensorSixthValue.textContent = sixthOn ? 'On' : 'Off';
    sensorSixthValue.className = `sensor-value ${sixthOn ? 'highlight' : ''}`;

    // Footer
    this._el('footerEntity').textContent = this._config.prefix;
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
