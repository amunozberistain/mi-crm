import React from 'react'
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import type { ProposalContent } from '@/lib/ai/proposal'

// ── Estilos ────────────────────────────────────────────────────────────────
// @react-pdf usa puntos tipográficos (pt), no píxeles.
// Los números sin unidad son pt. A4 tiene 595 x 842 pt.
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize:   10,
    color:      '#1f2937',
    backgroundColor: '#ffffff',
  },
  // Cabecera indigo
  header: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 40,
    paddingTop: 32,
    paddingBottom: 28,
  },
  headerLabel: {
    color: '#c7d2fe',
    fontSize: 8,
    letterSpacing: 2,
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 18,
    color: '#ffffff',
    lineHeight: 1.3,
  },
  headerMeta: {
    color: '#e0e7ff',
    fontSize: 9,
    marginTop: 4,
  },
  // Cuerpo del documento
  body: {
    paddingHorizontal: 40,
    paddingTop: 26,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontFamily:  'Helvetica-Bold',
    fontSize:    9,
    color:       '#4f46e5',
    letterSpacing: 1.2,
    marginBottom: 7,
    textTransform: 'uppercase',
  },
  paragraph: {
    fontSize:   10,
    lineHeight: 1.65,
    color:      '#374151',
  },
  bullet: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bulletDot: {
    width: 14,
    fontSize: 10,
    color: '#6366f1',
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.55,
    color: '#374151',
  },
  // Caja de inversión
  investmentBox: {
    backgroundColor: '#f5f3ff',
    borderRadius: 6,
    padding: 14,
    borderLeft: '3pt solid #6366f1',
  },
  investmentTotal: {
    fontFamily: 'Helvetica-Bold',
    fontSize:   22,
    color:      '#4f46e5',
    marginBottom: 6,
  },
  investmentDesc: {
    fontSize:   10,
    color:      '#374151',
    lineHeight: 1.5,
  },
  investmentPayment: {
    fontSize:   9,
    color:      '#6b7280',
    marginTop:  4,
  },
  // Divisor
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginVertical: 14,
  },
  // Pie de página
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
})

// ── Componente del documento ───────────────────────────────────────────────

interface Props {
  data:           ProposalContent
  dealTitle:      string
  contactName:    string | null
  contactCompany: string | null
}

function BulletList({ items }: { items: string[] }) {
  return (
    <>
      {items.map((item, i) => (
        <View key={i} style={s.bullet}>
          <Text style={s.bulletDot}>›</Text>
          <Text style={s.bulletText}>{item}</Text>
        </View>
      ))}
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function ProposalDocument({ data, dealTitle, contactName, contactCompany }: Props) {
  const dateStr = new Date().toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const investmentFormatted = new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(data.inversion.total)

  return (
    <Document title={data.titulo} language="es" author="CRM">
      <Page size="A4" style={s.page}>
        {/* ── Cabecera ── */}
        <View style={s.header}>
          <Text style={s.headerLabel}>PROPUESTA COMERCIAL</Text>
          <Text style={s.headerTitle}>{dealTitle}</Text>
          {contactName && (
            <Text style={s.headerMeta}>
              Para: {contactName}{contactCompany ? ` · ${contactCompany}` : ''}
            </Text>
          )}
          <Text style={s.headerMeta}>Fecha: {dateStr}</Text>
        </View>

        {/* ── Cuerpo ── */}
        <View style={s.body}>
          <Section title="Resumen ejecutivo">
            <Text style={s.paragraph}>{data.resumen}</Text>
          </Section>

          <View style={s.divider} />

          <Section title="Alcance del proyecto">
            <BulletList items={data.alcance} />
          </Section>

          <Section title="Entregables">
            <BulletList items={data.entregables} />
          </Section>

          <Section title="Cronograma">
            <Text style={s.paragraph}>{data.cronograma}</Text>
          </Section>

          <View style={s.divider} />

          <Section title="Inversión">
            <View style={s.investmentBox}>
              <Text style={s.investmentTotal}>{investmentFormatted}</Text>
              <Text style={s.investmentDesc}>{data.inversion.desglose}</Text>
              <Text style={s.investmentPayment}>Forma de pago: {data.inversion.forma_de_pago}</Text>
            </View>
          </Section>

          <Section title="Condiciones">
            <BulletList items={data.condiciones} />
          </Section>

          <Section title="Siguiente paso">
            <Text style={s.paragraph}>{data.siguiente_paso}</Text>
          </Section>
        </View>

        {/* ── Pie de página fijo en todas las hojas ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{data.titulo}</Text>
          <Text style={s.footerText}>Generado el {dateStr}</Text>
        </View>
      </Page>
    </Document>
  )
}

// ── Función de render ──────────────────────────────────────────────────────

export async function buildProposalPDF(props: Props): Promise<Buffer> {
  return renderToBuffer(<ProposalDocument {...props} />)
}
