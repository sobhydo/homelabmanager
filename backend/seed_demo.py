"""Seed the database with realistic demo data for screenshots and demos.

Usage:
    cd backend
    python seed_demo.py
"""

import os
import sys
from datetime import datetime, timedelta

# Ensure the app package is importable
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, init_db
from app.models.component import Component
from app.models.stock_transaction import StockTransaction
from app.models.category import Category
from app.models.footprint import Footprint
from app.models.bom import BOM, BOMItem
from app.models.invoice import Invoice, InvoiceItem
from app.models.tool import Tool, ToolCheckout
from app.models.material import Material
from app.models.machine import Machine, MaintenanceTask
from app.models.software import Software, Subscription
from app.models.supplier import Supplier, Manufacturer, SupplierPart, ManufacturerPart
from app.models.stock_location import StockLocation, StockItem
from app.models.build_order import BuildOrder, BuildAllocation, BuildOutput
from app.models.user import User
from app.services.auth import hash_password

now = datetime.utcnow()


def seed():
    init_db()
    db = SessionLocal()

    # Skip if data already exists
    if db.query(Component).count() > 5:
        print("Database already has data. Delete backend/data/homelab.db first to re-seed.")
        db.close()
        return

    print("Seeding demo data...")

    # ── Users ──────────────────────────────────────────────────────────
    if db.query(User).filter(User.username == "admin").first() is None:
        db.add(User(username="admin", hashed_password=hash_password("admin"),
                     role="admin", full_name="Admin User", email="admin@homelab.local"))
    if db.query(User).filter(User.username == "maker").first() is None:
        db.add(User(username="maker", hashed_password=hash_password("maker"),
                     role="user", full_name="Maker Mike", email="mike@homelab.local"))
    db.flush()

    # ── Footprints ─────────────────────────────────────────────────────
    footprints_data = [
        ("0201", "SMD", "0201 (0603 metric) chip footprint"),
        ("0402", "SMD", "0402 (1005 metric) chip footprint"),
        ("0603", "SMD", "0603 (1608 metric) chip footprint"),
        ("0805", "SMD", "0805 (2012 metric) chip footprint"),
        ("1206", "SMD", "1206 (3216 metric) chip footprint"),
        ("SOT-23", "SMD", "3-pin small outline transistor"),
        ("SOT-23-5", "SMD", "5-pin SOT-23 variant"),
        ("QFP-48", "SMD", "48-pin quad flat package"),
        ("QFN-20", "SMD", "20-pin quad flat no-lead"),
        ("SOIC-8", "SMD", "8-pin small outline IC"),
        ("SOIC-16", "SMD", "16-pin small outline IC"),
        ("TQFP-32", "SMD", "32-pin thin quad flat package"),
        ("DIP-8", "Through Hole", "8-pin dual inline package"),
        ("DIP-16", "Through Hole", "16-pin dual inline package"),
        ("USB-C", "SMD", "USB Type-C 16-pin receptacle"),
        ("SMA", "SMD", "SubMiniature version A diode package"),
    ]
    footprints = {}
    for name, cat, desc in footprints_data:
        fp = Footprint(name=name, category=cat, description=desc)
        db.add(fp)
        db.flush()
        footprints[name] = fp

    # ── Categories ─────────────────────────────────────────────────────
    cat_data = {
        "Resistors": ("Passive resistive components", [
            "Chip Resistors", "Precision Resistors", "Potentiometers"
        ]),
        "Capacitors": ("Passive capacitive components", [
            "Ceramic (MLCC)", "Electrolytic", "Tantalum", "Film"
        ]),
        "Inductors": ("Passive inductive components", [
            "Ferrite Beads", "Power Inductors", "RF Inductors"
        ]),
        "Semiconductors": ("Active semiconductor devices", [
            "MOSFETs", "BJTs", "Diodes", "Zener Diodes", "TVS Diodes", "LEDs"
        ]),
        "ICs": ("Integrated circuits", [
            "Microcontrollers", "Voltage Regulators", "Op-Amps",
            "Audio ICs", "Power Management", "RF Modules", "Sensors"
        ]),
        "Connectors": ("Electrical connectors", [
            "USB", "Pin Headers", "JST", "FPC/FFC", "Screw Terminals"
        ]),
        "Electromechanical": ("Switches, relays, and mechanical parts", [
            "Tactile Switches", "Slide Switches", "Relays", "Buzzers"
        ]),
        "Passives - Other": ("Crystals, fuses, and other passives", [
            "Crystals", "Oscillators", "Fuses", "Thermistors"
        ]),
    }
    categories = {}
    for name, (desc, children) in cat_data.items():
        parent = Category(name=name, description=desc)
        db.add(parent)
        db.flush()
        categories[name] = parent
        for child_name in children:
            child = Category(name=child_name, parent_id=parent.id)
            db.add(child)
            db.flush()
            categories[child_name] = child

    # ── Suppliers ──────────────────────────────────────────────────────
    suppliers_data = [
        ("LCSC", "https://www.lcsc.com", "Leading Chinese electronic component distributor", "support@lcsc.com"),
        ("DigiKey", "https://www.digikey.com", "Major US-based electronic component distributor", "sales@digikey.com"),
        ("Mouser", "https://www.mouser.com", "Global electronic component distributor", "sales@mouser.com"),
        ("JLCPCB", "https://www.jlcpcb.com", "PCB fabrication and SMT assembly service", "support@jlcpcb.com"),
        ("AliExpress", "https://www.aliexpress.com", "General marketplace for components and modules", None),
        ("Adafruit", "https://www.adafruit.com", "Maker-focused electronics retailer", "support@adafruit.com"),
    ]
    suppliers = {}
    for name, web, desc, email in suppliers_data:
        s = Supplier(name=name, website=web, description=desc, email=email)
        db.add(s)
        db.flush()
        suppliers[name] = s

    # ── Manufacturers ──────────────────────────────────────────────────
    mfrs_data = [
        ("Samsung Electro-Mechanics", "https://www.samsungsem.com", "MLCCs and passive components"),
        ("YAGEO", "https://www.yageo.com", "Resistors, capacitors, inductors"),
        ("UNI-ROYAL", None, "Chip resistors and capacitors"),
        ("Espressif", "https://www.espressif.com", "ESP32/ESP8266 WiFi/BLE SoCs and modules"),
        ("STMicroelectronics", "https://www.st.com", "STM32 MCUs, power management, sensors"),
        ("Texas Instruments", "https://www.ti.com", "Analog, embedded, power management ICs"),
        ("Microchip", "https://www.microchip.com", "PIC/AVR MCUs, analog, memory"),
        ("Vishay", "https://www.vishay.com", "Resistors, capacitors, diodes, MOSFETs"),
        ("Murata", "https://www.murata.com", "Capacitors, inductors, ferrite beads, filters"),
        ("XUNPU", None, "USB and connector manufacturer"),
        ("Silergy", "https://www.silergy.com", "DC-DC converters and power management"),
        ("Nexperia", "https://www.nexperia.com", "Discrete semiconductors, logic, ESD protection"),
    ]
    manufacturers = {}
    for name, web, desc in mfrs_data:
        m = Manufacturer(name=name, website=web, description=desc)
        db.add(m)
        db.flush()
        manufacturers[name] = m

    # ── Components ─────────────────────────────────────────────────────
    components_data = [
        # Resistors
        ("100Ω 0402 1%", "RC0402FR-07100RL", "0402WGF1000TCE", "Resistors", "Chip Resistors", "0402", 8500, 100, 0.0006, "YAGEO", "Bin A1"),
        ("1kΩ 0402 1%", "RC0402FR-071KL", "0402WGF1001TCE", "Resistors", "Chip Resistors", "0402", 9200, 100, 0.0006, "UNI-ROYAL", "Bin A1"),
        ("2.2kΩ 0402 1%", "RC0402FR-072K2L", "0402WGF2201TCE", "Resistors", "Chip Resistors", "0402", 7800, 100, 0.0006, "UNI-ROYAL", "Bin A1"),
        ("4.7kΩ 0402 1%", "RC0402FR-074K7L", "0402WGF4701TCE", "Resistors", "Chip Resistors", "0402", 6500, 100, 0.0006, "YAGEO", "Bin A1"),
        ("10kΩ 0402 1%", "RC0402FR-0710KL", "0402WGF1002TCE", "Resistors", "Chip Resistors", "0402", 12000, 100, 0.0006, "UNI-ROYAL", "Bin A2"),
        ("47kΩ 0402 1%", "RC0402FR-0747KL", "0402WGF4702TCE", "Resistors", "Chip Resistors", "0402", 4200, 100, 0.0005, "YAGEO", "Bin A2"),
        ("100kΩ 0402 1%", "RC0402FR-07100KL", "C60491", "Resistors", "Chip Resistors", "0402", 9800, 100, 0.0006, "YAGEO", "Bin A2"),
        ("1MΩ 0402 1%", "RC0402FR-071ML", None, "Resistors", "Chip Resistors", "0402", 3000, 100, 0.0006, "YAGEO", "Bin A2"),
        # Capacitors
        ("100nF 0402 X7R 16V", "CL05B104KO5NNNC", "C41851", "Capacitors", "Ceramic (MLCC)", "0402", 11000, 200, 0.0007, "Samsung Electro-Mechanics", "Bin B1"),
        ("100nF 0402 X7R 50V", "CL05B104KB54PNC", "C307331", "Capacitors", "Ceramic (MLCC)", "0402", 5600, 200, 0.0025, "Samsung Electro-Mechanics", "Bin B1"),
        ("1µF 0402 X5R 25V", "CL05A105KA5NQNC", "C52923", "Capacitors", "Ceramic (MLCC)", "0402", 8400, 200, 0.0018, "Samsung Electro-Mechanics", "Bin B1"),
        ("10µF 0402 X5R 6.3V", "CL05A106MQ5NUNC", "C15525", "Capacitors", "Ceramic (MLCC)", "0402", 4800, 200, 0.0039, "Samsung Electro-Mechanics", "Bin B2"),
        ("1nF 0402 X7R 50V", "CL05B102KB5NNNC", "C1523", "Capacitors", "Ceramic (MLCC)", "0402", 7500, 200, 0.0007, "Samsung Electro-Mechanics", "Bin B2"),
        ("100µF 1206 X5R 6.3V", "CL31A107MQHNNNE", "C15008", "Capacitors", "Ceramic (MLCC)", "1206", 450, 50, 0.0435, "Samsung Electro-Mechanics", "Bin B3"),
        ("22µF 0805 X5R 10V", "CL21A226MAQNNNE", None, "Capacitors", "Ceramic (MLCC)", "0805", 2200, 100, 0.0089, "Samsung Electro-Mechanics", "Bin B3"),
        # Inductors / Ferrite Beads
        ("120Ω@100MHz Ferrite 0402", "BLM15PX121SN1D", "C88970", "Inductors", "Ferrite Beads", "0402", 2800, 100, 0.004, "Murata", "Bin C1"),
        ("1µH Power Inductor", "MWTC201610S1R5MT", None, "Inductors", "Power Inductors", "0805", 900, 50, 0.05, "Murata", "Bin C1"),
        # Semiconductors
        ("N-Ch MOSFET 60V 0.3A SOT-323", "WNM6002-3/TR", "C501342", "Semiconductors", "MOSFETs", "SOT-23", 580, 50, 0.0242, "Vishay", "Bin D1"),
        ("P-Ch MOSFET 20V 4A SOT-23", "2305-B", "C22362821", "Semiconductors", "MOSFETs", "SOT-23", 920, 50, 0.0094, "Nexperia", "Bin D1"),
        ("Schottky Diode 40V 1A SOD-123", "B5819W", "C908224", "Semiconductors", "Diodes", "SMA", 850, 100, 0.0123, "Vishay", "Bin D2"),
        ("TVS Diode 17V DFN1006", "BDFN2C051V", "C152024", "Semiconductors", "TVS Diodes", "0402", 560, 50, 0.0202, "Nexperia", "Bin D2"),
        ("Red/Green Dual LED 3x2mm", "NCD3010RG1", "C2917189", "Semiconductors", "LEDs", "0603", 95, 20, 0.0563, None, "Bin D3"),
        ("WS2812B Addressable LED", "TX1812MWCA5-F01", "C27637010", "Semiconductors", "LEDs", "0805", 280, 50, 0.0319, None, "Bin D3"),
        # ICs
        ("ESP32-C5 WiFi/BLE Module", "ESP32-C5-WROOM-1-N16R8", "C53054799", "ICs", "RF Modules", "QFP-48", 8, 2, 5.2257, "Espressif", "Bin E1"),
        ("ES8311 Audio Codec QFN-20", "ES8311", "C962342", "ICs", "Audio ICs", "QFN-20", 28, 5, 0.3694, None, "Bin E1"),
        ("NS4150B Class-D Amp MSOP-8", "NS4150B", "C189961", "ICs", "Audio ICs", "SOIC-8", 45, 10, 0.1387, None, "Bin E1"),
        ("LGS4056H Battery Charger", "LGS4056HDA", "C5124109", "ICs", "Power Management", "SOIC-8", 42, 10, 0.1313, None, "Bin E2"),
        ("SY8089A Buck Converter 2A", "SY8089A1AAC", "C479074", "ICs", "Voltage Regulators", "SOT-23-5", 135, 20, 0.0569, "Silergy", "Bin E2"),
        ("STM32F103C8T6", "STM32F103C8T6", None, "ICs", "Microcontrollers", "TQFP-32", 25, 5, 1.85, "STMicroelectronics", "Bin E3"),
        ("ATmega328P-AU", "ATMEGA328P-AU", None, "ICs", "Microcontrollers", "TQFP-32", 15, 5, 2.10, "Microchip", "Bin E3"),
        ("LM1117-3.3V SOT-223", "LM1117IMPX-3.3", None, "ICs", "Voltage Regulators", "SOT-23", 60, 20, 0.35, "Texas Instruments", "Bin E2"),
        ("AMS1117-5.0V SOT-223", "AMS1117-5.0", None, "ICs", "Voltage Regulators", "SOT-23", 75, 20, 0.25, None, "Bin E2"),
        ("NE555 Timer SOIC-8", "NE555DR", None, "ICs", "Sensors", "SOIC-8", 40, 10, 0.18, "Texas Instruments", "Bin E4"),
        # Connectors
        ("USB-C 16P Receptacle", "TYPEC-304A-ACP16O", "C2909610", "Connectors", "USB", "USB-C", 140, 20, 0.0791, "XUNPU", "Bin F1"),
        ("1.25mm 2P Header Vertical", "ZX-MX1.25-2PZZ", "C7430458", "Connectors", "JST", "DIP-8", 480, 50, 0.0121, None, "Bin F2"),
        ("1.25mm 2P SMD RA", "1.25-2PWB", "C2905009", "Connectors", "JST", "SOT-23", 570, 50, 0.0176, None, "Bin F2"),
        ("0.5mm 16P FPC Connector", "WL0540013-160R-001", "C48736336", "Connectors", "FPC/FFC", "SOIC-16", 140, 20, 0.0589, None, "Bin F3"),
        ("2.54mm 1x40 Male Header", "PH-1x40", None, "Connectors", "Pin Headers", "DIP-16", 200, 50, 0.05, None, "Bin F2"),
        # Electromechanical
        ("Slide Switch SPDT 6.7mm", "MSK12C02G25-B", "C22435663", "Electromechanical", "Slide Switches", "SOIC-8", 280, 30, 0.026, None, "Bin G1"),
        ("Tactile Switch 4.5x2.2mm RA", "GT-TC191A-H026-L60", "C2890363", "Electromechanical", "Tactile Switches", "SOT-23", 45, 10, 0.1303, None, "Bin G1"),
    ]

    components = {}
    for (name, mpn, spn, cat, subcat, fp_name, qty, min_qty, price, mfr, loc) in components_data:
        fp = footprints.get(fp_name)
        cat_obj = categories.get(subcat) or categories.get(cat)
        c = Component(
            name=name,
            manufacturer_part_number=mpn,
            supplier_part_number=spn,
            description=f"{name} - {subcat}",
            category=cat,
            subcategory=subcat,
            package_type=fp_name,
            quantity=qty,
            min_quantity=min_qty,
            location=loc,
            unit_price=price,
            supplier="LCSC",
            manufacturer=mfr,
            mpn=mpn,
            footprint_id=fp.id if fp else None,
            category_id=cat_obj.id if cat_obj else None,
            status="Active",
            notes="",
        )
        db.add(c)
        db.flush()
        components[mpn] = c

    # ── Stock Transactions (recent activity) ───────────────────────────
    txn_data = [
        ("RC0402FR-0710KL", 10000, "purchase", -2),
        ("CL05A105KA5NQNC", 5000, "purchase", -3),
        ("ESP32-C5-WROOM-1-N16R8", 10, "purchase", -5),
        ("RC0402FR-07100KL", -50, "build", -1),
        ("CL05B104KO5NNNC", -200, "build", -1),
        ("SY8089A1AAC", -10, "build", -1),
        ("TYPEC-304A-ACP16O", -5, "build", -1),
        ("STM32F103C8T6", 25, "purchase", -7),
        ("B5819W", 1000, "purchase", -10),
        ("RC0402FR-071KL", -100, "adjustment", 0),
        ("CL05A106MQ5NUNC", 3000, "purchase", -4),
        ("NS4150B", 50, "purchase", -6),
        ("2305-B", -20, "build", -2),
        ("BLM15PX121SN1D", 3000, "purchase", -8),
    ]
    for mpn, qty, reason, days_ago in txn_data:
        comp = components.get(mpn)
        if comp:
            db.add(StockTransaction(
                component_id=comp.id,
                quantity_change=qty,
                reason=reason,
                created_at=now + timedelta(days=days_ago),
            ))

    # ── Stock Locations ────────────────────────────────────────────────
    loc_lab = StockLocation(name="Lab Bench", description="Main electronics workbench area")
    loc_shelf = StockLocation(name="Component Shelf", description="Organized component storage shelves")
    loc_cabinet = StockLocation(name="Parts Cabinet", description="Multi-drawer SMD parts cabinet with labeled bins")
    loc_storage = StockLocation(name="Bulk Storage", description="Overflow and bulk component storage room")
    db.add_all([loc_lab, loc_shelf, loc_cabinet, loc_storage])
    db.flush()

    # Nested locations
    for label in ["Bin A1", "Bin A2", "Bin B1", "Bin B2", "Bin B3", "Bin C1"]:
        db.add(StockLocation(name=label, parent_id=loc_cabinet.id, description=f"Drawer {label}"))
    for label in ["Shelf 1", "Shelf 2", "Shelf 3"]:
        db.add(StockLocation(name=label, parent_id=loc_shelf.id))
    db.flush()

    # ── Stock Items (a few linked to locations) ────────────────────────
    for i, (mpn, comp) in enumerate(list(components.items())[:12]):
        db.add(StockItem(
            component_id=comp.id,
            location_id=loc_cabinet.id,
            quantity=comp.quantity,
            status="in_stock",
        ))

    # ── BOMs ───────────────────────────────────────────────────────────
    bom1 = BOM(name="ESP32-C5 Audio Board v1.2", description="WiFi/BLE audio streaming board with battery charging",
               version="1.2", status="active", total_cost=42.80)
    bom2 = BOM(name="LED Controller v2.0", description="WS2812B addressable LED strip controller with STM32",
               version="2.0", status="active", total_cost=18.50)
    bom3 = BOM(name="Sensor Hub v0.3", description="Multi-sensor breakout board prototype",
               version="0.3", status="draft", total_cost=12.30)
    db.add_all([bom1, bom2, bom3])
    db.flush()

    bom1_items = [
        ("ESP32-C5-WROOM-1-N16R8", "M1", 1), ("ES8311", "U1", 1), ("NS4150B", "U2", 1),
        ("LGS4056HDA", "U3", 1), ("SY8089A1AAC", "U4", 1), ("TYPEC-304A-ACP16O", "USB1", 1),
        ("CL05A105KA5NQNC", "C3,C4,C7", 3), ("CL05A106MQ5NUNC", "C6,C12", 2),
        ("RC0402FR-072K2L", "R1,R2", 2), ("RC0402FR-07100KL", "R3,R4,R5", 3),
        ("MSK12C02G25-B", "SW1", 1), ("GT-TC191A-H026-L60", "SW2", 1),
        ("BLM15PX121SN1D", "L1,L2", 2), ("NCD3010RG1", "LED1", 1),
    ]
    for mpn, ref, qty in bom1_items:
        comp = components.get(mpn)
        db.add(BOMItem(bom_id=bom1.id, component_id=comp.id if comp else None,
                        reference_designator=ref, quantity=qty,
                        manufacturer_part_number=mpn, matched=1 if comp else 0,
                        value=comp.name if comp else mpn, package=comp.package_type if comp else ""))

    bom2_items = [
        ("STM32F103C8T6", "U1", 1), ("TX1812MWCA5-F01", "LED1-LED8", 8),
        ("RC0402FR-0710KL", "R1,R2,R3", 3), ("CL05B104KO5NNNC", "C1,C2,C3,C4", 4),
        ("LM1117IMPX-3.3", "U2", 1), ("CL05A106MQ5NUNC", "C5,C6", 2),
    ]
    for mpn, ref, qty in bom2_items:
        comp = components.get(mpn)
        db.add(BOMItem(bom_id=bom2.id, component_id=comp.id if comp else None,
                        reference_designator=ref, quantity=qty,
                        manufacturer_part_number=mpn, matched=1 if comp else 0,
                        value=comp.name if comp else mpn, package=comp.package_type if comp else ""))
    db.flush()

    # ── Build Orders ───────────────────────────────────────────────────
    bo1 = BuildOrder(reference="BO-2026-001", bom_id=bom1.id, title="Audio Board Batch #1",
                     description="First production batch of ESP32-C5 audio boards",
                     quantity=10, completed_quantity=7, status="in_progress", priority=2,
                     target_date=(now + timedelta(days=5)).date(),
                     started_at=now - timedelta(days=3))
    bo2 = BuildOrder(reference="BO-2026-002", bom_id=bom2.id, title="LED Controller Prototype Run",
                     description="5 units for testing with WS2812B strips",
                     quantity=5, completed_quantity=0, status="pending", priority=1,
                     target_date=(now + timedelta(days=14)).date())
    bo3 = BuildOrder(reference="BO-2026-003", bom_id=bom1.id, title="Audio Board Rev1.2 - Customer Order",
                     description="Custom order - 20 units",
                     quantity=20, completed_quantity=20, status="completed", priority=3,
                     target_date=(now - timedelta(days=2)).date(),
                     started_at=now - timedelta(days=10),
                     completed_at=now - timedelta(days=1))
    db.add_all([bo1, bo2, bo3])
    db.flush()

    # ── Invoices ───────────────────────────────────────────────────────
    inv1 = Invoice(invoice_number="WM2602110063", supplier="LCSC",
                   total_amount=365.42, currency="USD", status="processed",
                   created_at=now - timedelta(days=12))
    inv2 = Invoice(invoice_number="DK-2026-88421", supplier="DigiKey",
                   total_amount=128.75, currency="USD", status="processed",
                   created_at=now - timedelta(days=20))
    inv3 = Invoice(invoice_number="MO-9945217", supplier="Mouser",
                   total_amount=89.30, currency="USD", status="uploaded",
                   created_at=now - timedelta(days=2))
    db.add_all([inv1, inv2, inv3])
    db.flush()

    inv1_items = [
        ("ESP32-C5-WROOM-1-N16R8", "ESP32-C5 WiFi/BLE Module 16MB/8MB", 10, 5.2257, 52.26),
        ("CL05A105KA5NQNC", "1µF 0402 X5R 25V MLCC", 10000, 0.0018, 18.00),
        ("CL05A106MQ5NUNC", "10µF 0402 X5R 6.3V MLCC", 5000, 0.0039, 19.50),
        ("RC0402FR-07100KL", "100kΩ 0402 1% Resistor", 10000, 0.0006, 6.00),
        ("SY8089A1AAC", "2A Buck Converter SOT-23-5", 150, 0.0569, 8.54),
        ("TYPEC-304A-ACP16O", "USB-C 16P Receptacle", 150, 0.0791, 11.87),
        ("BLM15PX121SN1D", "120Ω Ferrite Bead 0402", 3000, 0.004, 12.00),
    ]
    for mpn, desc, qty, up, tp in inv1_items:
        comp = components.get(mpn)
        db.add(InvoiceItem(invoice_id=inv1.id, component_id=comp.id if comp else None,
                            description=desc, part_number=mpn, quantity=qty,
                            unit_price=up, total_price=tp, matched=1 if comp else 0))

    inv2_items = [
        ("STM32F103C8T6", "STM32F103C8T6 MCU TQFP-32", 25, 1.85, 46.25),
        ("ATMEGA328P-AU", "ATmega328P-AU MCU TQFP-32", 15, 2.10, 31.50),
        ("LM1117IMPX-3.3", "LM1117 3.3V LDO SOT-223", 50, 0.35, 17.50),
        ("NE555DR", "NE555 Timer SOIC-8", 40, 0.18, 7.20),
    ]
    for mpn, desc, qty, up, tp in inv2_items:
        comp = components.get(mpn)
        db.add(InvoiceItem(invoice_id=inv2.id, component_id=comp.id if comp else None,
                            description=desc, part_number=mpn, quantity=qty,
                            unit_price=up, total_price=tp, matched=1 if comp else 0))

    # ── Tools ──────────────────────────────────────────────────────────
    tools_data = [
        ("Hakko FX-951 Soldering Station", "Soldering", "Hakko", "FX-951", "SN-F951-2024", "Lab Bench", "excellent", 149.99, -365),
        ("Quick 861DW Hot Air Station", "Soldering", "Quick", "861DW", "SN-861-2023", "Lab Bench", "good", 189.00, -500),
        ("Rigol DS1054Z Oscilloscope", "Test Equipment", "Rigol", "DS1054Z", "DS1ZA230900123", "Lab Bench", "excellent", 349.00, -400),
        ("Fluke 87V Multimeter", "Test Equipment", "Fluke", "87V", "FL87V-2024-001", "Lab Bench", "good", 429.00, -300),
        ("Miniware TS101 Portable Iron", "Soldering", "Miniware", "TS101", None, "Portable Kit", "excellent", 79.99, -60),
        ("Weller WLC100 Station", "Soldering", "Weller", "WLC100", None, "Storage Room", "fair", 39.99, -1200),
        ("Hot Plate Reflow Controller", "Reflow", "Custom", "DIY-V2", None, "Lab Bench", "good", 85.00, -90),
        ("ESD Mat 60x40cm", "ESD Protection", "Generic", "ESD-6040", None, "Lab Bench", "good", 25.00, -200),
        ("PCB Holder / Third Hand", "Fixtures", "Omnifixo", "OF-M4", None, "Lab Bench", "excellent", 55.00, -45),
        ("Stereo Microscope 7-45x", "Inspection", "AmScope", "SM-4TZ-144A", "AM-2024-55", "Lab Bench", "excellent", 299.00, -180),
        ("Solder Paste Stencil Printer", "SMT", "DIY", "Manual-V1", None, "Lab Bench", "good", 120.00, -150),
        ("UV Exposure Unit", "PCB Fab", "Custom", "UV-BOX-1", None, "Storage Room", "fair", 45.00, -800),
    ]
    for (name, cat, brand, model, sn, loc, cond, price, days_ago) in tools_data:
        db.add(Tool(
            name=name, category=cat, brand=brand, model_number=model,
            serial_number=sn, location=loc, condition=cond,
            purchase_price=price, purchase_date=now + timedelta(days=days_ago),
            status="available",
            description=f"{brand} {model} - {cat.lower()}",
        ))

    # ── Materials ──────────────────────────────────────────────────────
    materials_data = [
        ("Solder Wire 0.5mm Sn63/Pb37", "Consumables", 250.0, "g", 50.0, "Lab Bench", "Kester", 18.99),
        ("Solder Paste T4 Sn63/Pb37", "Consumables", 3.0, "jars", 1.0, "Fridge", "Mechanic", 12.50),
        ("Flux Pen No-Clean", "Consumables", 5.0, "pcs", 2.0, "Lab Bench", "MG Chemicals", 8.99),
        ("IPA 99% Isopropyl Alcohol", "Cleaning", 2.0, "L", 0.5, "Cabinet", "Generic", 15.00),
        ("Kapton Tape 10mm", "Tape", 3.0, "rolls", 1.0, "Lab Bench", "Generic", 4.50),
        ("Solder Wick 2.5mm", "Consumables", 4.0, "rolls", 2.0, "Lab Bench", "Chemtronics", 6.99),
        ("FR4 Blank PCB 100x70mm", "PCB Stock", 20.0, "pcs", 5.0, "Shelf 2", "Generic", 0.80),
        ("Thermal Paste Arctic MX-4", "Thermal", 1.0, "tubes", 1.0, "Cabinet", "Arctic", 8.50),
        ("Heat Shrink Tubing Assortment", "Insulation", 1.0, "sets", 1.0, "Bin G1", "Generic", 12.00),
        ("Solder Tip Cleaner Brass Wool", "Cleaning", 2.0, "pcs", 1.0, "Lab Bench", "Hakko", 7.99),
    ]
    for (name, cat, qty, unit, min_qty, loc, supplier, price) in materials_data:
        db.add(Material(name=name, category=cat, quantity=qty, unit=unit,
                         min_quantity=min_qty, location=loc, supplier=supplier, unit_price=price))

    # ── Machines ───────────────────────────────────────────────────────
    machines_data = [
        ("Neoden YY1", "Pick & Place", "Neoden", "YY1", "ND-YY1-2024-01", "192.168.1.50", "Lab Bench", "online", 2800.00, -180),
        ("Creality Ender 3 V3 SE", "3D Printer", "Creality", "Ender 3 V3 SE", "CR-E3V3-001", "192.168.1.51", "Print Corner", "online", 199.00, -120),
        ("Prusa MK4S", "3D Printer", "Prusa", "MK4S", "PRS-MK4S-2025", "192.168.1.52", "Print Corner", "online", 799.00, -60),
        ("CNC 3018 Pro", "CNC", "Genmitsu", "3018-PRO", None, None, "Garage", "offline", 189.00, -400),
        ("Reflow Oven T-962A", "Reflow Oven", "Puhui", "T-962A", "PH-962A-001", None, "Lab Bench", "online", 320.00, -250),
        ("xTool D1 Pro Laser Engraver", "Laser Engraver", "xTool", "D1 Pro", "XT-D1P-2024", "192.168.1.55", "Garage", "offline", 599.00, -90),
    ]
    for (name, mtype, mfr, model, sn, ip, loc, status, price, days_ago) in machines_data:
        m = Machine(name=name, machine_type=mtype, manufacturer=mfr, model=model,
                    serial_number=sn, ip_address=ip, location=loc, status=status,
                    purchase_price=price, purchase_date=now + timedelta(days=days_ago),
                    notes=f"{mfr} {model} {mtype.replace('_', ' ')}")
        db.add(m)
        db.flush()

        # Add maintenance tasks for some machines
        if status == "online":
            db.add(MaintenanceTask(
                machine_id=m.id, title=f"Clean and inspect {name}",
                description="Regular cleaning and mechanical inspection",
                priority="medium", status="pending",
                scheduled_date=now + timedelta(days=7),
                recurrence_days=30,
            ))
            if mtype in ("pnp", "3d_printer"):
                db.add(MaintenanceTask(
                    machine_id=m.id, title=f"Lubricate rails on {name}",
                    description="Apply lubricant to linear rails and lead screws",
                    priority="low", status="pending",
                    scheduled_date=now + timedelta(days=14),
                    recurrence_days=60,
                ))

    # ── Software Licenses ──────────────────────────────────────────────
    software_data = [
        ("KiCad", "8.0.4", "EDA", "Open Source", None, "https://www.kicad.org", "Lab PC", "active"),
        ("Altium Designer", "24.5", "EDA", "Subscription", "AD-2024-XXXX", "https://www.altium.com", "Lab PC", "active"),
        ("PrusaSlicer", "2.8.0", "3D Printing", "Open Source", None, "https://www.prusa3d.com", "Lab PC, Laptop", "active"),
        ("Cura", "5.7.0", "3D Printing", "Open Source", None, "https://ultimaker.com/cura", "Lab PC", "active"),
        ("FreeCAD", "0.22", "CAD", "Open Source", None, "https://www.freecad.org", "Lab PC", "active"),
        ("VS Code", "1.95", "Development", "Open Source", None, "https://code.visualstudio.com", "All PCs", "active"),
        ("Fusion 360", "2.0", "CAD", "Personal Use", "F360-2024-XXXX", "https://www.autodesk.com", "Lab PC", "active"),
        ("OpenSCAD", "2024.12", "CAD", "Open Source", None, "https://openscad.org", "Lab PC", "active"),
        ("LTSpice", "24.0.12", "Simulation", "Freeware", None, "https://www.analog.com", "Lab PC", "active"),
        ("Proxmox VE", "8.2", "Virtualization", "Open Source", None, "https://www.proxmox.com", "Server", "active"),
    ]
    for (name, ver, cat, lic, key, url, installed, status) in software_data:
        db.add(Software(name=name, version=ver, category=cat, license_type=lic,
                         license_key=key, url=url, installed_on=installed, status=status))

    # ── Subscriptions ──────────────────────────────────────────────────
    subs_data = [
        ("JLCPCB SMT Credits", "JLCPCB", 0, "monthly", "Manufacturing", "https://www.jlcpcb.com", "active", -90, 275),
        ("GitHub Pro", "GitHub", 4.00, "monthly", "Development", "https://github.com", "active", -365, 365),
        ("Altium 365", "Altium", 65.00, "monthly", "EDA", "https://www.altium.com", "active", -60, 305),
        ("Cloudflare Pro", "Cloudflare", 20.00, "monthly", "Infrastructure", "https://www.cloudflare.com", "active", -180, 185),
        ("Home Assistant Cloud", "Nabu Casa", 6.50, "monthly", "Smart Home", "https://www.nabucasa.com", "active", -300, 65),
        ("Tailscale Pro", "Tailscale", 0, "monthly", "Networking", "https://tailscale.com", "active", -200, 165),
        ("Adobe Creative Cloud", "Adobe", 54.99, "monthly", "Design", "https://www.adobe.com", "active", -30, 335),
        ("PCBWay Membership", "PCBWay", 0, "yearly", "Manufacturing", "https://www.pcbway.com", "active", -180, 185),
    ]
    for (name, prov, cost, cycle, cat, url, status, start_offset, expiry_offset) in subs_data:
        db.add(Subscription(
            name=name, provider=prov, cost=cost, billing_cycle=cycle,
            category=cat, url=url, status=status,
            start_date=now + timedelta(days=start_offset),
            expiry_date=now + timedelta(days=expiry_offset),
            auto_renew=1,
        ))

    # ── Supplier Parts (link some components to suppliers) ─────────────
    lcsc = suppliers["LCSC"]
    digikey = suppliers["DigiKey"]
    for mpn, comp in list(components.items())[:20]:
        if comp.supplier_part_number:
            db.add(SupplierPart(
                component_id=comp.id, supplier_id=lcsc.id,
                supplier_part_number=comp.supplier_part_number,
                unit_price=comp.unit_price, url=f"https://www.lcsc.com/product-detail/{comp.supplier_part_number}.html",
            ))
    for mpn, comp in list(components.items())[20:30]:
        db.add(SupplierPart(
            component_id=comp.id, supplier_id=digikey.id,
            supplier_part_number=mpn, unit_price=(comp.unit_price or 0) * 1.2,
            url=f"https://www.digikey.com/en/products/detail/{mpn}",
        ))

    # ── Manufacturer Parts ─────────────────────────────────────────────
    mfr_map = {
        "YAGEO": ["RC0402FR-07100RL", "RC0402FR-071KL", "RC0402FR-074K7L", "RC0402FR-0747KL", "RC0402FR-07100KL", "RC0402FR-071ML"],
        "Samsung Electro-Mechanics": ["CL05B104KO5NNNC", "CL05B104KB54PNC", "CL05A105KA5NQNC", "CL05A106MQ5NUNC", "CL05B102KB5NNNC", "CL31A107MQHNNNE", "CL21A226MAQNNNE"],
        "Espressif": ["ESP32-C5-WROOM-1-N16R8"],
        "STMicroelectronics": ["STM32F103C8T6"],
        "Silergy": ["SY8089A1AAC"],
        "Murata": ["BLM15PX121SN1D"],
    }
    for mfr_name, mpns in mfr_map.items():
        mfr_obj = manufacturers.get(mfr_name)
        if mfr_obj:
            for mpn in mpns:
                comp = components.get(mpn)
                if comp:
                    db.add(ManufacturerPart(
                        component_id=comp.id, manufacturer_id=mfr_obj.id,
                        manufacturer_part_number=mpn,
                    ))

    # ── Commit everything ──────────────────────────────────────────────
    db.commit()
    db.close()

    print("Done! Seeded:")
    print(f"  - {len(components_data)} components across 8 categories")
    print(f"  - {len(footprints_data)} footprints")
    print(f"  - {len(suppliers_data)} suppliers, {len(mfrs_data)} manufacturers")
    print(f"  - 3 BOMs with items")
    print(f"  - 3 build orders")
    print(f"  - 3 invoices with line items")
    print(f"  - {len(tools_data)} tools")
    print(f"  - {len(materials_data)} materials")
    print(f"  - {len(machines_data)} machines with maintenance tasks")
    print(f"  - {len(software_data)} software licenses")
    print(f"  - {len(subs_data)} subscriptions")
    print(f"  - {len(txn_data)} stock transactions")
    print(f"  - 4 stock locations + sub-locations")


if __name__ == "__main__":
    seed()
