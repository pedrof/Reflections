import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a2e', backgroundColor: '#ffffff' },
  header: { borderBottom: '2pt solid #6366f1', paddingBottom: 12, marginBottom: 20 },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#6366f1', marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#374151' },
  meta: { fontSize: 9, color: '#6b7280', marginTop: 2 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#6366f1', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1pt solid #e5e7eb', paddingBottom: 4, marginBottom: 8 },
  narrative: { fontSize: 10, lineHeight: 1.6, color: '#374151' },
  accBlock: { marginBottom: 12, paddingBottom: 12, borderBottom: '0.5pt solid #f3f4f6' },
  accIndex: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#9ca3af', marginBottom: 4 },
  starLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#6366f1', marginTop: 4, marginBottom: 1 },
  starText: { fontSize: 9.5, lineHeight: 1.5, color: '#374151' },
  bulletItem: { fontSize: 9.5, color: '#374151', marginBottom: 2 },
  footer: { position: 'absolute', bottom: 24, left: 48, right: 48, fontSize: 8, color: '#9ca3af', flexDirection: 'row', justifyContent: 'space-between' },
});

function STARBlock({ text }) {
  if (!text) return <Text style={styles.starText}>{text}</Text>;
  const sections = text.split(/\*\*(Situation|Task|Action|Result):\*\*/);
  if (sections.length <= 1) return <Text style={styles.starText}>{text}</Text>;

  const labels = ['Situation', 'Task', 'Action', 'Result'];
  return (
    <View>
      {labels.map((label, i) => {
        const content = sections[i * 2 + 2];
        if (!content) return null;
        return (
          <View key={label}>
            <Text style={styles.starLabel}>{label}</Text>
            <Text style={styles.starText}>{content.trim()}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function WARDocument({ data }) {
  const generated = new Date().toLocaleDateString('en-US', { dateStyle: 'long' });
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Weekly Activity Report</Text>
          <Text style={styles.subtitle}>{data.employee?.name}</Text>
          <Text style={styles.meta}>Period: {data.startDate} – {data.endDate}</Text>
          <Text style={styles.meta}>Generated: {generated}</Text>
        </View>

        {data.narrative && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.narrative}>{data.narrative}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accomplishments ({data.accomplishments?.length})</Text>
          {data.accomplishments?.map((a, i) => (
            <View key={a.id} style={styles.accBlock}>
              <Text style={styles.accIndex}>#{i + 1} — {new Date(a.dateOfAccomplishment).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
              <STARBlock text={a.editedStarText || a.starText || a.rawText} />
            </View>
          ))}
        </View>

        {data.objectivesCovered?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Objectives Supported</Text>
            {data.objectivesCovered.map((o) => (
              <Text key={o.id} style={styles.bulletItem}>• {o.title}</Text>
            ))}
          </View>
        )}

        {data.elementsCovered?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance Elements Demonstrated</Text>
            {data.elementsCovered.map((e) => (
              <Text key={e.id} style={styles.bulletItem}>• {e.title}</Text>
            ))}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>Reflections — {data.employee?.name}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
