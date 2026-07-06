/**
 * Integration adapter contract. The catalog and quote modules never talk to
 * a real ERP/PIM/CRM directly — they go through this interface so a pilot
 * customer's NetSuite/SAP/Dynamics connector can be dropped in later without
 * touching product code. `MockIntegrationAdapter` is what demo/dev runs on.
 */
export interface CatalogSyncResult {
  productsUpserted: number;
  syncedAt: string;
}

export interface IntegrationAdapter {
  readonly type: "ERP" | "CRM" | "EMAIL";
  readonly name: string;
  testConnection(): Promise<{ ok: boolean; message: string }>;
  syncCatalog?(): Promise<CatalogSyncResult>;
}

export class MockIntegrationAdapter implements IntegrationAdapter {
  constructor(
    public readonly type: "ERP" | "CRM" | "EMAIL",
    public readonly name: string,
  ) {}

  async testConnection() {
    return { ok: true, message: `${this.name} connection simulated successfully (mock adapter — no live system attached).` };
  }

  async syncCatalog(): Promise<CatalogSyncResult> {
    return { productsUpserted: 0, syncedAt: new Date().toISOString() };
  }
}
