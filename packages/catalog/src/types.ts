// Model danych kanonicznego katalogu Turbo-Git (zgodny z docs/catalog/master-catalog-data-contract.md).
// Dane pochodzą z realnego eksportu WooCommerce, znormalizowane. Każde pole ma status jakości.

export type FieldStatus = "VERIFIED" | "NEEDS_REVIEW" | "MISSING";

export interface Field<T> {
  value: T;
  status: FieldStatus;
}

export interface GtinField {
  value: string[];
  status: FieldStatus;
  identifier_exists: boolean;
}

export interface CatalogProduct {
  product_id: number;
  sku: string;
  /** true, gdy obecne SKU jest numerem turbo (anty-wzorzec do naprawy). */
  sku_is_turbo_number: boolean;
  name: string;
  price: string;
  in_stock: boolean;
  image: string;
  short_description: string;
  warranty_months: number;
  fields: {
    turbo_number: Field<string[]>;
    turbo_crossref: Field<string[]>;
    oe_numbers: Field<string[]>;
    mpn: Field<string[]>;
    turbo_manufacturer: Field<string>;
    vehicle_make: Field<string[]>;
    vehicle_model: Field<string>;
    engine_code: Field<string[]>;
    engine_capacity: Field<string>;
    power_hp: Field<string>;
    fuel_type: Field<string>;
    vehicle_segment: Field<string>;
    gvo_quality: Field<string>;
    condition: Field<string>;
    gtin: GtinField;
    google_brand: Field<string>;
  };
}

export interface Catalog {
  version: string;
  source: string;
  count: number;
  products: CatalogProduct[];
}
