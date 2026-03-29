"""Classify electronic components into categories based on description and part info."""

import re
from typing import Optional

# Maps keywords in description to (category, package_hint)
# Order matters - first match wins, so put more specific patterns first
CATEGORY_RULES: list[tuple[str, str, Optional[str]]] = [
    # Inductors / Ferrite (must be before Resistors - ferrite beads have Ω in description)
    (r"\bferrite bead\b", "Inductors", None),
    (r"\binductor\b|\bchoke\b|\bfixed inductor", "Inductors", None),

    # Resistors
    (r"\bresistor\b|thick film resistor|thin film resistor", "Resistors", None),
    (r"\b\d+[kKmM]?Ω\b.*\bresistor\b", "Resistors", None),
    (r"\bcurrent sense resistor\b", "Resistors", None),
    (r"\b\d+[kKmM]?Ω\b.*\b0[0-9]{3}\b", "Resistors", None),

    # Capacitors
    (r"\bcapacitor\b|\bceramic cap", "Capacitors", None),
    (r"\b\d+[pnuμ]F\b", "Capacitors", None),

    # LEDs
    (r"\bLED\b.*\b(indication|addressable|discrete)\b", "Semiconductors", None),
    (r"\bLED\b", "Semiconductors", None),

    # Diodes
    (r"\bTVS\b|\btvs diode\b|\besd diode\b", "Semiconductors", None),
    (r"\bzener\b", "Semiconductors", None),
    (r"\bdiode\b|\bschottky\b", "Semiconductors", None),

    # Transistors / FETs
    (r"\bMOSFET\b|\bFET\b|\bn-channel\b|\bp-channel\b", "Semiconductors", None),
    (r"\btransistor\b|\bBJT\b", "Semiconductors", None),

    # Voltage regulators
    (r"\bvoltage regulator\b|\bLDO\b|\bbuck\b|\bboost\b|\bDC.DC\b", "ICs", None),

    # ICs
    (r"\baudio amplifier\b", "ICs", None),
    (r"\bbattery.*(charg|management)\b", "ICs", None),
    (r"\bmotor driver\b", "ICs", None),
    (r"\bmicrocontroller\b|\bMCU\b", "ICs", None),
    (r"\bESP32\b|\bRF transceiver\b|\bmodule\b", "ICs", None),
    (r"\bADC\b|\bDAC\b|\bcodec\b|\bsignal switch\b|\bmultiplexer\b", "ICs", None),
    (r"\bIMU\b|\binertial\b|\bcompass\b|\bsensor\b|\bmagnet\b", "ICs", None),
    (r"\bpower distribution\b|\bload driver\b|\bhigh side switch\b", "ICs", None),
    (r"\bop.amp\b|\bamplifier\b", "ICs", None),

    # Connectors
    (r"\bUSB.C\b|\bUSB TYPE.C\b|\bUSB\b.*\bconnector\b", "Connectors", None),
    (r"\bFFC\b|\bFPC\b.*\bconnector\b", "Connectors", None),
    (r"\bconnector\b|\bheader\b|\breceptacle\b", "Connectors", None),
    (r"\bpin header\b|\bboard to board\b", "Connectors", None),
    (r"\bJST\b", "Connectors", None),

    # Electromechanical
    (r"\btactile switch\b|\bpush button\b", "Electromechanical", None),
    (r"\bslide switch\b", "Electromechanical", None),
    (r"\bswitch\b.*\bSPST\b|\bswitch\b.*\bSPDT\b", "Electromechanical", None),
    (r"\brelay\b", "Electromechanical", None),
    (r"\bbuzzer\b", "Electromechanical", None),

    # Passives - Other
    (r"\bcrystal\b|\boscillator\b", "Passives - Other", None),
    (r"\bfuse\b", "Passives - Other", None),
    (r"\bthermistor\b|\bNTC\b|\bPTC\b", "Passives - Other", None),
    (r"\bSD card\b|\bmicro SD\b|\bTF card\b", "Connectors", None),
]

# Package extraction patterns
PACKAGE_PATTERNS = [
    (r"\b(0201|0402|0603|0805|1206|1210|1812|2010|2512)\b", None),  # SMD sizes
    (r"\b(SOT-23(?:-[356])?L?)\b", None),
    (r"\b(SOT-323)\b", None),
    (r"\b(MSOP-\d+)\b", None),
    (r"\b(QFN-\d+(?:-EP)?(?:\([^)]+\))?)\b", None),
    (r"\b(DFN-?\d+(?:-\d+)?(?:\([^)]+\))?)\b", None),
    (r"\b(SOP-\d+)\b", None),
    (r"\b(SOIC-\d+)\b", None),
    (r"\b(SOD-\d+)\b", None),
    (r"\b(TSSOP-\d+)\b", None),
    (r"\b(WSON-\d+(?:-EP)?(?:\([^)]+\))?)\b", None),
    (r"\b(LGA-\d+(?:\([^)]+\))?)\b", None),
    (r"\b(DSBGA-\d+)\b", None),
    (r"\b(SC-\d+)\b", None),
    (r"\b(TO-\d+\w*)\b", None),
    (r"\b(SMD-\d+[Pp],\d+[\.\d]*x\d+[\.\d]*mm)\b", None),
]


def classify_component(description: str, part_number: str = "") -> tuple[str, Optional[str]]:
    """Classify a component based on its description.

    Returns:
        Tuple of (category_name, package_type).
        Category defaults to "ICs" if no match found.
        Package may be None if not detected.
    """
    text = f"{description} {part_number}".strip()
    if not text:
        return "ICs", None

    # Find category
    category = None
    for pattern, cat, _ in CATEGORY_RULES:
        if re.search(pattern, text, re.IGNORECASE):
            category = cat
            break

    if not category:
        category = "ICs"  # default for unrecognized electronic parts

    # Find package
    package = None
    for pattern, _ in PACKAGE_PATTERNS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            package = m.group(1)
            break

    return category, package
