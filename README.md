# GE Dryer Card

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/)
[![License: Unlicense](https://img.shields.io/badge/license-Unlicense-blue.svg)](https://unlicense.org)

A custom Lovelace card for GE Profile dryers connected via the [SmartHQ integration](https://github.com/simbaja/ha_gehome).

> **Looking for all GE appliance cards in one package?** Check out [GE Appliances Card](https://github.com/ChrisCaho/ge-appliances-card) — a bundle containing washer, dryer, and oven cards.

## Features

- Front-load dryer design with circular drum door and chrome ring
- Blue LCD display showing cycle, sub-cycle, and time remaining
- Temperature-based color glow (no heat blue through extra high orange-red)
- Rotating drum with lifter bars when active
- Steam wisps animation for steam cycles
- Sensor grid: heat level, dryness, dryer sheets
- Option badges: Eco Dry, Extended Tumble, Tumble, Steam
- Dark theme matching the GE Profile aesthetic

## Installation

### HACS (Recommended)

1. Open HACS → Frontend → 3-dot menu → Custom repositories
2. Add `https://github.com/ChrisCaho/ge-dryer-card` as **Dashboard**
3. Search for "GE Dryer Card" and install
4. Refresh your browser (Ctrl+Shift+R)

### Manual

1. Download `ge-dryer-card.js` from the [latest release](https://github.com/ChrisCaho/ge-dryer-card/releases)
2. Copy to `/config/www/community/ge-dryer-card/ge-dryer-card.js`
3. Add as a Lovelace resource:
   - URL: `/hacsfiles/ge-dryer-card/ge-dryer-card.js`
   - Type: JavaScript Module

## Configuration

```yaml
type: custom:ge-dryer-card
prefix: sensor.hasvr1_ge_dryer_laundry
name: GE Dryer  # optional
```

### Options

| Option   | Type   | Required | Default     | Description                        |
|----------|--------|----------|-------------|------------------------------------|
| `prefix` | string | yes      | —           | Entity prefix (without the `_suffix`) |
| `name`   | string | no       | `GE Dryer`  | Display name on the card           |

### Entity Suffixes

The card reads these sensor entities automatically using the prefix:

| Suffix                                  | Description                    |
|-----------------------------------------|--------------------------------|
| `_machine_state`                        | Machine state (Off, etc)       |
| `_cycle`                                | Current cycle name             |
| `_sub_cycle`                            | Current sub-cycle              |
| `_time_remaining`                       | Time remaining (seconds)       |
| `_delay_time_remaining`                 | Delay start remaining          |
| `_dryer_temperaturenew_option`          | Dryer temperature level        |
| `_dryer_drynessnew_level`               | Dryness level                  |
| `_dryer_ecodry_option_selection`        | Eco Dry on/off                 |
| `_dryer_extended_tumble_option_selection`| Extended Tumble on/off         |
| `_dryer_sheet_inventory`                | Dryer sheet inventory count    |
| `_dryer_sheet_usage_configuration`      | Sheet usage config             |
| `_dryer_tumble_status`                  | Tumble status                  |

**Note:** The card handles the inconsistent SmartHQ entity naming for `tumble_status` (some use `ge_dryerlaundry` instead of `ge_dryer_laundry`).

## Temperature Color Map

| Temperature | Color   |
|-------------|---------|
| No Heat     | #4488bb |
| Air Fluff   | #4488bb |
| Extra Low   | #55aacc |
| Low         | #66bbaa |
| Medium Low  | #99aa44 |
| Medium      | #ccaa22 |
| High        | #dd7722 |
| Extra High  | #cc3311 |

## Compatibility

- Designed for GE Profile dryers via SmartHQ integration
- Requires Home Assistant 2024.1+
- Works with HACS

## License

This project is released into the public domain under [The Unlicense](LICENSE).
