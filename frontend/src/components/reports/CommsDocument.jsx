import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a2e', backgroundColor: '#ffffff' },
  header: { borderBottom: '2pt solid #6366f1', paddingBottom: 12, marginBottom: 20 },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#6366f1', marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#374151' },
  meta: { fontSize: 9, color: '#6b7280', marginTop: 2 },
  employeeBlock: { marginBottom: 20 },
  employeeName: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#111827', backgroundColor: '#f9fafb', padding: 6, marginBottom: 8 },
  accBlock: { marginBottom: 12, paddingLeft: 12, borderLeft: '2pt solid #e5e7eb' },
  accMeta: { fontSize: 8, color: '#9ca3af', marginBottom: 4 },
  starText: { fontSize: 9.5, lineHeight: 1.5, color: '#374151' },
  commsNote: { fontSize: 9, color: '#6366f1', fontFamily: 'Helvetica-Oblique', marginTop: 4 },
  footer: { position: 'absolute', bottom: 24, left: 48, right: 48, fontSize: 8, color: '#9ca3af', flexDirection: 'row', justifyContent: 'space-between' },
});

function stripMarkdown(text) {
  return text?.replace(/\*\*(.*?)\*\*/g, '$1') || '';
}

export default function CommsDocument({ data }) {
  const generated = new Date().toLocaleDateString('en-US', { dateStyle: 'long' });
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Accomplishments Report</Text>
          <Text style={styles.subtitle}>{data.tenant?.name} — Communications Team</Text>
          <Text style={styles.meta}>Period: {data.startDate} – {data.endDate}</Text>
          <Text style={styles.meta}>Generated: {generated} · {data.total} accomplishments</Text>
        </View>

        {data.groups?.map((group) => (
          <View key={group.user.id} style={styles.employeeBlock}>
            <Text style={styles.employeeName}>{group.user.name}</Text>
            {group.accomplishments.map((a) => (
              <View key={a.id} style={styles.accBlock}>
                <Text style={styles.accMeta}>
                  {new Date(a.dateOfAccomplishment).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                </Text>
                <Text style={styles.starText}>{stripMarkdown(a.editedStarText || a.starText || a.rawText)}</Text>
                {a.commsNote && <Text style={styles.commsNote}>Note: {a.commsNote}</Text>}
              </View>
            ))}
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>Communications Team Report — {data.tenant?.name}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
