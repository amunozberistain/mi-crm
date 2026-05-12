import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import type { BudgetDraft } from '@/lib/ai/budget'

const styles = StyleSheet.create({
  page:           { padding: 48, fontFamily: 'Helvetica', fontSize: 10, color: '#1f2937' },
  logo:           { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#4f46e5', marginBottom: 2 },
  meta:           { fontSize: 9, color: '#6b7280', marginBottom: 28 },
  title:          { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 4 },
  subtitle:       { fontSize: 10, color: '#6b7280', marginBottom: 24 },
  section:        { marginBottom: 20 },
  sectionTitle:   { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#4f46e5', marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#e0e7ff' },
  text:           { fontSize: 10, color: '#374151', lineHeight: 1.5 },
  tableHeader:    { flexDirection: 'row', backgroundColor: '#4f46e5', padding: 6, borderRadius: 2 },
  thText:         { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 9 },
  row:            { flexDirection: 'row', padding: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rowAlt:         { flexDirection: 'row', padding: 6, backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  col1:           { width: '35%' },
  col2:           { width: '30%' },
  col3:           { width: '15%', textAlign: 'right' },
  col4:           { width: '20%', textAlign: 'right' },
  totalBox:       { marginTop: 8, padding: 12, backgroundColor: '#eef2ff', borderLeftWidth: 4, borderLeftColor: '#4f46e5', alignItems: 'flex-end' },
  totalLabel:     { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#4f46e5' },
  footer:         { position: 'absolute', bottom: 32, left: 48, right: 48, textAlign: 'center', fontSize: 8, color: '#9ca3af', borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8 },
})

function eur(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

interface Props {
  draft: BudgetDraft
  date?: string
}

function BudgetDocument({ draft, date = new Date().toLocaleDateString('es-ES') }: Props) {
  const total = draft.partidas.reduce((sum, p) => sum + p.cantidad * p.precio_unitario, 0)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.logo}>The Mind Flow AI Studio</Text>
        <Text style={styles.meta}>Presupuesto · {date}</Text>

        <Text style={styles.title}>{draft.titulo}</Text>
        {draft.cliente ? (
          <Text style={styles.subtitle}>Preparado para: {draft.cliente}</Text>
        ) : null}

        {draft.descripcion_proyecto ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descripción del proyecto</Text>
            <Text style={styles.text}>{draft.descripcion_proyecto}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Desglose de partidas</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.thText, styles.col1]}>Concepto</Text>
            <Text style={[styles.thText, styles.col2]}>Descripción</Text>
            <Text style={[styles.thText, styles.col3]}>Uds.</Text>
            <Text style={[styles.thText, styles.col4]}>Total</Text>
          </View>
          {draft.partidas.map((p, i) => (
            <View key={i} style={i % 2 === 0 ? styles.row : styles.rowAlt}>
              <Text style={[styles.text, styles.col1]}>{p.concepto}</Text>
              <Text style={[styles.text, styles.col2]}>{p.descripcion}</Text>
              <Text style={[styles.text, styles.col3]}>{p.cantidad}</Text>
              <Text style={[styles.text, styles.col4]}>{eur(p.cantidad * p.precio_unitario)}</Text>
            </View>
          ))}
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total: {eur(total)}</Text>
          </View>
        </View>

        {draft.plazo_estimado ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Plazo de entrega</Text>
            <Text style={styles.text}>{draft.plazo_estimado}</Text>
          </View>
        ) : null}

        {draft.notas ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Condiciones y notas</Text>
            <Text style={styles.text}>{draft.notas}</Text>
          </View>
        ) : null}

        <Text style={styles.footer} fixed>
          Presupuesto generado automáticamente · Válido 30 días desde la fecha de emisión
        </Text>
      </Page>
    </Document>
  )
}

export async function buildBudgetPDF(draft: BudgetDraft): Promise<Buffer> {
  return renderToBuffer(<BudgetDocument draft={draft} />) as Promise<Buffer>
}
