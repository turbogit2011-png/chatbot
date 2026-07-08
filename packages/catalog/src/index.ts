export * from "./types";
export * from "./normalize";
export * from "./search";

import type { Catalog, CatalogProduct } from "./types";
import raw from "../data/products.normalized.json";

/** Załadowany, znormalizowany katalog (z realnego eksportu WooCommerce). */
export const catalog = raw as unknown as Catalog;
export const products: CatalogProduct[] = catalog.products;

/** Szybki dostęp po SKU lub product_id. */
export function findByProductId(id: number): CatalogProduct | undefined {
  return products.find((p) => p.product_id === id);
}
