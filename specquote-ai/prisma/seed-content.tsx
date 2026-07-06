import { renderToBuffer, Document, Page, Text, StyleSheet } from "@react-pdf/renderer";

// A valid, minimal 1x1 transparent PNG — used so IMAGE attachments in the
// demo data are real, openable files rather than garbage bytes.
export const PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 12 },
  line: { marginBottom: 4 },
});

export async function renderDemoRequestPdf(subject: string, body: string): Promise<Buffer> {
  return renderToBuffer(
    <Document title={subject}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{subject}</Text>
        {body.split("\n").map((line, i) => (
          <Text key={i} style={styles.line}>
            {line}
          </Text>
        ))}
      </Page>
    </Document>,
  );
}
