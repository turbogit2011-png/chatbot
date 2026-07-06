/**
 * Shared realistic industrial-B2B reference data used by the mock AI
 * provider, the catalog, and the demo data seed — kept in one place so
 * mocked RFQs and the seeded catalog/CRM speak the same vocabulary.
 */

export const PRODUCT_FAMILIES = [
  "Ball Bearings",
  "Pneumatic Cylinders",
  "Servo Motors",
  "Planetary Gearboxes",
  "Solenoid Valves",
  "Pressure Sensors",
  "HVAC Air Handling Units",
  "CNC Tooling Inserts",
  "Hydraulic Pumps",
  "Pipe Flanges",
  "Gaskets & Seals",
  "Linear Guide Rails",
  "Proximity Switches",
  "Industrial Couplings",
  "Control Panel Enclosures",
  "Frequency Inverters",
  "Ball Screws",
  "Check Valves",
  "Thermocouples",
  "Conveyor Rollers",
] as const;

export const MATERIALS = [
  "Stainless steel 304",
  "Stainless steel 316L",
  "Carbon steel S235",
  "Aluminum 6061-T6",
  "Brass CW614N",
  "Cast iron GG25",
  "PTFE",
  "EPDM rubber",
  "Bronze CuSn8",
  "Hardened tool steel",
  "Nylon PA6",
  "Titanium Grade 5",
] as const;

export const FINISHES = [
  "Passivated",
  "Zinc plated",
  "Anodized",
  "Powder coated RAL 7035",
  "Black oxide",
  "Polished Ra 0.4",
  "Hot-dip galvanized",
  "Uncoated / mill finish",
] as const;

export const TOLERANCES = ["IT6", "IT7", "IT8", "±0.05 mm", "±0.02 mm", "±0.1 mm", "H7/g6", "DIN 2768-m"] as const;

export const CERTIFICATIONS = [
  "CE",
  "ATEX Zone 2",
  "ISO 9001 material certificate 3.1",
  "PED 2014/68/EU",
  "RoHS",
  "IECEx",
  "NSF/FDA food-grade",
  "None specified",
] as const;

export const DELIVERY_TERMS = ["EXW", "FCA", "CPT", "DAP", "DDP", "CIF"] as const;

export const UNITS = ["pcs", "sets", "m", "kg", "boxes"] as const;

export const COUNTRIES = [
  "Poland",
  "Germany",
  "Netherlands",
  "Sweden",
  "Czech Republic",
  "Austria",
  "Belgium",
  "Denmark",
  "Lithuania",
  "Romania",
] as const;

export const INDUSTRIES = [
  "Industrial Automation",
  "HVAC & Building Systems",
  "CNC Machining",
  "Packaging Machinery",
  "Hydraulics & Pneumatics",
  "MRO & Maintenance",
  "Machine Building",
  "Process Equipment",
] as const;

/** Realistic demo customer companies (also used to seed CRM Accounts). */
export const DEMO_ACCOUNTS: Array<{ name: string; industry: string; country: string }> = [
  { name: "NordMach Systems", industry: "Machine Building", country: "Sweden" },
  { name: "HelioFab Engineering", industry: "CNC Machining", country: "Germany" },
  { name: "Baltic Process Controls", industry: "Process Equipment", country: "Lithuania" },
  { name: "Vector Pneumatics", industry: "Hydraulics & Pneumatics", country: "Poland" },
  { name: "Rhine Thermal Solutions", industry: "HVAC & Building Systems", country: "Germany" },
  { name: "Delta Packaging Lines", industry: "Packaging Machinery", country: "Netherlands" },
  { name: "Carpatia Steelworks", industry: "Machine Building", country: "Romania" },
  { name: "Oresund Automation", industry: "Industrial Automation", country: "Denmark" },
  { name: "Vltava Precision Parts", industry: "CNC Machining", country: "Czech Republic" },
  { name: "Alpine Fluid Power", industry: "Hydraulics & Pneumatics", country: "Austria" },
  { name: "Flanders Conveyance", industry: "Packaging Machinery", country: "Belgium" },
  { name: "Mazovia Metal Works", industry: "MRO & Maintenance", country: "Poland" },
  { name: "Elbe Sensorik GmbH", industry: "Industrial Automation", country: "Germany" },
  { name: "Silesian Gear Co.", industry: "Machine Building", country: "Poland" },
  { name: "Nordkap Marine Systems", industry: "Process Equipment", country: "Sweden" },
  { name: "Danube Valve Group", industry: "Hydraulics & Pneumatics", country: "Austria" },
  { name: "Amber Coast Logistics Equipment", industry: "MRO & Maintenance", country: "Lithuania" },
  { name: "Zeeland Air Systems", industry: "HVAC & Building Systems", country: "Netherlands" },
  { name: "Tatra Robotics", industry: "Industrial Automation", country: "Czech Republic" },
  { name: "Carpathian CNC Partners", industry: "CNC Machining", country: "Romania" },
  { name: "Jutland Bearing Supply", industry: "MRO & Maintenance", country: "Denmark" },
  { name: "Wielkopolska Hydraulics", industry: "Hydraulics & Pneumatics", country: "Poland" },
  { name: "Schwarzwald Feinmechanik", industry: "CNC Machining", country: "Germany" },
  { name: "Brabant Process Systems", industry: "Process Equipment", country: "Netherlands" },
  { name: "Pomerania Packaging Tech", industry: "Packaging Machinery", country: "Poland" },
];

export const FIRST_NAMES = [
  "Anna",
  "Marek",
  "Johan",
  "Lukas",
  "Petra",
  "Stefan",
  "Ingrid",
  "Tomasz",
  "Freya",
  "Dieter",
  "Katarzyna",
  "Willem",
  "Sofia",
  "Mateusz",
  "Greta",
  "Pavel",
] as const;

export const LAST_NAMES = [
  "Nowak",
  "Kowalski",
  "Muller",
  "Andersson",
  "Novak",
  "Wagner",
  "Larsen",
  "Kowalczyk",
  "de Vries",
  "Schmidt",
  "Jansen",
  "Berg",
  "Vermeulen",
  "Horak",
  "Wisniewski",
] as const;
