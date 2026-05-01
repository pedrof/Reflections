import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 56, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a2e', backgroundColor: '#ffffff' },
  header: { borderBottom: '2pt solid #6366f1', paddingBottom: 14, marginBottom: 24 },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#6366f1', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#374151' },
  meta: { fontSize: 9, color: '#6b7280', marginTop: 2 },
  sectionHeading: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#6366f1', textTransform: 'uppercase', letterSpacing: 1.2, borderBottom: '1pt solid #e5e7eb', paddingBottom: 5, marginBottom: 14, marginTop: 20 },
  itemTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1f2937', marginBottom: 5 },
  paragraph: { fontSize: 10, lineHeight: 1.7, color: '#374151', textAlign: 'justify' },
  itemBlock: { marginBottom: 16, paddingBottom: 16, borderBottom: '0.5pt solid #f3f4f6' },
  footer: { position: 'absolute', bottom: 28, left: 56, right: 56, fontSize: 8, color: '#9ca3af', flexDirection: 'row', justifyContent: 'space-between' },
});

export default function YearlyReportDocument({ data }) {
  const generated = new Date().toLocaleDateString('en-US', { dateStyle: 'long' });
  const objectives = data.objectives?.filter((o) => o.paragraph) ?? [];
  const elements = data.elements?.filter((e) => e.paragraph) ?? [];

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Annual Performance Report</Text>
          <Text style={styles.subtitle}>{data.employee?.name}</Text>
          <Text style={styles.meta}>Fiscal Year: FY{data.fiscalYear}</Text>
          <Text style={styles.meta}>Generated: {generated}</Text>
        </View>

        {objectives.length > 0 && (
          <View>
            <Text style={styles.sectionHeading}>Objectives</Text>
            {objectives.map((o) => (
              <View key={o.id} style={styles.itemBlock}>
                <Text style={styles.itemTitle}>{o.title}</Text>
                <Text style={styles.paragraph}>{o.paragraph}</Text>
              </View>
            ))}
          </View>
        )}

        {elements.length > 0 && (
          <View>
            <Text style={styles.sectionHeading}>Performance Elements</Text>
            {elements.map((e) => (
              <View key={e.id} style={styles.itemBlock}>
                <Text style={styles.itemTitle}>{e.title}</Text>
                <Text style={styles.paragraph}>{e.paragraph}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>Reflections — {data.employee?.name} — FY{data.fiscalYear}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
