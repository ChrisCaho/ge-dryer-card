# GE Dryer Card — Frequently Asked Questions

---

**What is the `sheets` configuration option?**

The GE Profile dryer sheet dispenser is a built-in cartridge that automatically adds dryer sheets during a cycle. When `sheets: true` (the default), the sensor grid shows a "Sheets" cell with the current inventory count from the cartridge.

If your dryer does not have the built-in sheet dispenser, set `sheets: false`. This replaces the Sheets cell in the sensor grid with WasherLink status instead, which is more useful on dryers without the cartridge.

---

**What is WasherLink?**

WasherLink is a communication feature built into compatible GE washers and dryers that allows the two appliances to coordinate automatically. When the washer finishes a cycle, it can signal the dryer to automatically select the appropriate drying cycle based on what was washed.

When `sheets: false`, the card displays a "WasherLink" cell in the sensor grid. It shows green "Linked" when the connection between the washer and dryer is active, and "Off" when it is not.

---

**Why is the door handle on the left side of the drum?**

The card is designed to be paired with the [GE Washer Card](https://github.com/ChrisCaho/ge-washer-card) on your dashboard. On a real side-by-side washer and dryer, the door handles face each other toward the center. With the washer card placed to the left and the dryer card to the right, the handle positions mirror that real-world layout — the washer handle is on the right and the dryer handle is on the left, so they face each other.

---

**What is the blocked vent warning?**

The blocked vent warning is a safety alert that appears when the dryer reports a restricted airflow condition via the `dryer_blocked_vent_fault` binary sensor. This typically means the lint trap needs cleaning or the exhaust duct has an obstruction. The card displays a prominent pulsing red banner above the drum when this fault is active. Clear the lint trap and inspect the vent duct, then the warning will disappear once the dryer clears the fault.

---

**What do the heat level colors mean?**

The drum glow and the Heat sensor cell in the grid change color based on the active temperature setting:

| Heat Level  | Color       |
|-------------|-------------|
| No Heat     | Blue        |
| Air Fluff   | Blue        |
| Extra Low   | Light blue  |
| Low         | Teal        |
| Medium Low  | Amber       |
| Medium      | Orange      |
| High        | Deep orange |
| Extra High  | Red-orange  |

When the dryer is off or idle, the drum has no glow and the heat cell shows the current selection without color highlighting.

---

**Why do I see steam wisps inside the drum?**

Steam wisps are animated only when the dryer is running a steam cycle. The card detects this by checking whether the cycle name or sub-cycle name contains the word "steam". If you see steam wisps, the dryer is actively running a steam refresh or steam sanitize cycle.

---

**The lifter bars inside the drum look unusual — are they correct?**

Yes. The four lifter bars are short radial fins that are mounted on the drum wall and point inward toward the center. They rotate together with the drum as a single unit while the dryer is active. This matches how real front-load dryer lifters work — they tumble clothes by lifting them as the drum turns. When the dryer is off, the lifters stop in whatever position they were at.

---

**The card shows errors or missing values for the tumble status entity. What is wrong?**

SmartHQ uses inconsistent entity naming across different dryer models. For some dryers, the tumble status entity is named using `ge_dryer_laundry` in the entity ID, while others use `ge_dryerlaundry` (without the underscore between "dryer" and "laundry"). The card automatically checks both naming variants and uses whichever one exists in your Home Assistant instance. If the value is still missing, verify that your SmartHQ integration is creating a `dryer_tumble_status` entity by checking **Settings > Devices and Services > Entities** and searching for your dryer's entity prefix.

---

**Can I control the dryer from this card?**

No. This card is read-only and displays the current state of the dryer. It does not send any commands to the appliance. Cycle selection, start, stop, and settings changes must be done through the SmartHQ app or directly on the dryer's control panel.

---

**Which GE dryers are compatible?**

The card works with any GE Profile front-load dryer that is connected to Home Assistant via the SmartHQ integration and exposes the standard sensor entities. The features displayed on the card (Eco Dry, Extended Tumble, WasherLink, dryer sheet inventory) may not be present on all models — the card gracefully shows "--" for any sensor entity that does not exist in your setup.

The card has been tested with GE Profile dryers using SmartHQ on Home Assistant 2024.1 and later. Older GE appliances that do not support SmartHQ connectivity are not compatible.

---

**What version of Home Assistant is required?**

Home Assistant 2024.1 or newer is required.

---

**Where can I get all three GE appliance cards (washer, dryer, oven) at once?**

Install [GE Appliances Card](https://github.com/ChrisCaho/ge-appliances-card) from HACS. It bundles the washer, dryer, and oven cards in a single repository so you only need one HACS entry.
