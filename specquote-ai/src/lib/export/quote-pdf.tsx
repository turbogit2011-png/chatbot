import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1D2939" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  brand: { fontSize: 18, fontWeight: 700 },
  muted: { color: "#667085" },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", color: "#475467" },
  row: { flexDirection: "row" },
  col: { flex: 1 },
  table: { marginTop: 8, borderTop: "1px solid #EAECF0" },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottom: "1px solid #EAECF0",
    paddingVertical: 6,
    backgroundColor: "#F9FAFB",
  },
  tableRow: { flexDirection: "row", borderBottom: "1px solid #F2F4F7", paddingVertical: 6 },
  cellDesc: { flex: 3 },
  cellSku: { flex: 1.2 },
  cellQty: { flex: 0.8, textAlign: "right" },
  cellPrice: { flex: 1, textAlign: "right" },
  cellTotal: { flex: 1, textAlign: "right" },
  totalsBox: { marginTop: 16, alignItems: "flex-end" },
  totalsRow: { flexDirection: "row", width: 220, justifyContent: "space-between", marginBottom: 3 },
  grandTotal: { fontSize: 13, fontWeight: 700 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#98A2B3", textAlign: "center" },
});

export interface QuotePdfData {
  orgName: string;
  brandingFooterText?: string | null;
  brandingPrimaryColor?: string | null;
  quoteNumber: string;
  version: number;
  status: string;
  currency: string;
  accountName: string;
  contactName?: string;
  createdAt: string;
  validUntil?: string | null;
  paymentTerms: string;
  deliveryTerms: string;
  notes?: string | null;
  lineItems: Array<{
    description: string;
    sku?: string | null;
    quantity: number;
    unit: string;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  discountTotal: number;
  total: number;
}

function money(value: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

function QuotePdfDocument({ data }: { data: QuotePdfData }) {
  return (
    <Document title={`Quote ${data.quoteNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>{data.orgName}</Text>
            <Text style={styles.muted}>Quote {data.quoteNumber} · v{data.version}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 14, fontWeight: 700 }}>QUOTATION</Text>
            <Text style={styles.muted}>Issued: {data.createdAt}</Text>
            {data.validUntil ? <Text style={styles.muted}>Valid until: {data.validUntil}</Text> : null}
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.col, styles.section]}>
            <Text style={styles.sectionTitle}>Customer</Text>
            <Text>{data.accountName}</Text>
            {data.contactName ? <Text style={styles.muted}>{data.contactName}</Text> : null}
          </View>
          <View style={[styles.col, styles.section]}>
            <Text style={styles.sectionTitle}>Commercial terms</Text>
            <Text>Payment: {data.paymentTerms}</Text>
            <Text>Delivery: {data.deliveryTerms}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.cellDesc}>Description</Text>
            <Text style={styles.cellSku}>SKU</Text>
            <Text style={styles.cellQty}>Qty</Text>
            <Text style={styles.cellPrice}>Unit price</Text>
            <Text style={styles.cellTotal}>Total</Text>
          </View>
          {data.lineItems.map((li, idx) => (
            <View style={styles.tableRow} key={idx}>
              <Text style={styles.cellDesc}>{li.description}</Text>
              <Text style={styles.cellSku}>{li.sku ?? "—"}</Text>
              <Text style={styles.cellQty}>
                {li.quantity} {li.unit}
              </Text>
              <Text style={styles.cellPrice}>{money(li.unitPrice, data.currency)}</Text>
              <Text style={styles.cellTotal}>{money(li.lineTotal, data.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text style={styles.muted}>Subtotal</Text>
            <Text>{money(data.subtotal, data.currency)}</Text>
          </View>
          {data.discountTotal > 0 ? (
            <View style={styles.totalsRow}>
              <Text style={styles.muted}>Discount</Text>
              <Text>-{money(data.discountTotal, data.currency)}</Text>
            </View>
          ) : null}
          <View style={styles.totalsRow}>
            <Text style={styles.grandTotal}>Total</Text>
            <Text style={styles.grandTotal}>{money(data.total, data.currency)}</Text>
          </View>
        </View>

        {data.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Technical notes</Text>
            <Text>{data.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>
          {data.brandingFooterText ?? `${data.orgName} — generated by SpecQuote AI`}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderQuotePdf(data: QuotePdfData): Promise<Buffer> {
  return renderToBuffer(<QuotePdfDocument data={data} />);
}
