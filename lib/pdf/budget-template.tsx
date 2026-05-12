import React from 'react'
import { Document, Page, Text, View, Font, renderToBuffer } from '@react-pdf/renderer'
import type { BudgetDraft } from '@/lib/ai/budget'

// ── Fuentes ───────────────────────────────────────────────────────────────

Font.register({
  family: 'Playfair',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/playfair-display@5/files/playfair-display-latin-400-normal.woff' },
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/playfair-display@5/files/playfair-display-latin-700-normal.woff', fontWeight: 'bold' },
  ],
})
Font.registerHyphenationCallback((w) => [w])

// ── Paleta ────────────────────────────────────────────────────────────────

const C = { cream: '#F3E9DC', dark: '#5E3023', med: '#895737', terra: '#C08552' } as const

// ── Utilidades ────────────────────────────────────────────────────────────

const usd = (n: number) => '$' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)

// ── Componentes compartidos ───────────────────────────────────────────────

function SLabel({ children }: { children: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ height: 0.5, backgroundColor: C.terra, marginBottom: 7 }} />
      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, letterSpacing: 2.5, color: C.terra }}>
        {children.toUpperCase()}
      </Text>
    </View>
  )
}

function ImgPlaceholder({ h = 200 }: { h?: number }) {
  return (
    <View style={{ height: h, backgroundColor: C.med, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontFamily: 'Helvetica', fontSize: 8, color: C.cream, letterSpacing: 3, opacity: 0.45 }}>IMAGEN</Text>
    </View>
  )
}

function Hr() {
  return <View style={{ height: 0.5, backgroundColor: C.med, marginVertical: 14, opacity: 0.3 }} />
}

function Footer() {
  return (
    <View style={{ position: 'absolute', bottom: 24, left: 52, right: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: C.med, letterSpacing: 2, opacity: 0.8 }}>
        THE MIND FLOW  ·  AI STUDIO
      </Text>
      <Text
        render={({ pageNumber }) => `${pageNumber}`}
        style={{ fontFamily: 'Helvetica', fontSize: 7, color: C.terra }}
      />
    </View>
  )
}

// ── Página 1 — Portada ────────────────────────────────────────────────────

function PageCover({ titulo, cliente, date }: { titulo: string; cliente: string; date: string }) {
  return (
    <Page size="A4" style={{ backgroundColor: C.cream, flexDirection: 'column' }}>
      {/* Zona superior — logo (≈28% de 842pt = 236pt) */}
      <View style={{ height: 236, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 52 }}>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 14, letterSpacing: 6, color: C.dark }}>
          THE MIND FLOW
        </Text>
        <Text style={{ fontFamily: 'Helvetica', fontSize: 9, letterSpacing: 3.5, color: C.med, marginTop: 5 }}>
          AI STUDIO
        </Text>
      </View>

      {/* Bloque terracota — 40% = 337pt */}
      <View style={{ height: 337, backgroundColor: C.terra, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 64 }}>
        <Text style={{ fontFamily: 'Playfair', fontWeight: 'bold', fontSize: 60, color: C.cream, textAlign: 'center', lineHeight: 1.1 }}>
          Presupuesto
        </Text>
        {titulo ? (
          <Text style={{ fontFamily: 'Helvetica', fontSize: 11, color: C.cream, textAlign: 'center', marginTop: 14, opacity: 0.85 }}>
            {titulo}
          </Text>
        ) : null}
      </View>

      {/* Zona inferior — cliente + fecha (restante ≈269pt) */}
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 56 }}>
        {cliente ? (
          <Text style={{ fontFamily: 'Playfair', fontWeight: 'bold', fontSize: 24, color: C.dark, marginBottom: 10 }}>
            {cliente}
          </Text>
        ) : null}
        <Text style={{ fontFamily: 'Helvetica', fontSize: 10, color: C.med, letterSpacing: 1 }}>
          {date}
        </Text>
      </View>
    </Page>
  )
}

// ── Página 2 — Resumen del proyecto ───────────────────────────────────────

function PageSummary({ draft }: { draft: BudgetDraft }) {
  const totalVids = draft.partidas
    .filter((p) => /v[íi]deo/i.test(p.concepto))
    .reduce((s, p) => s + p.cantidad, 0)

  return (
    <Page size="A4" style={{ backgroundColor: C.cream, paddingHorizontal: 52, paddingTop: 48, paddingBottom: 60 }}>
      <SLabel>Resumen del proyecto</SLabel>

      <View style={{ flexDirection: 'row', gap: 28 }}>
        {/* Columna izquierda */}
        <View style={{ flex: 1 }}>
          {draft.descripcion_proyecto ? (
            <Text style={{ fontFamily: 'Helvetica', fontSize: 11, color: C.dark, lineHeight: 1.75, marginBottom: 22 }}>
              {draft.descripcion_proyecto}
            </Text>
          ) : null}

          {draft.cliente ? (
            <View style={{ marginBottom: 18 }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, letterSpacing: 2, color: C.terra, marginBottom: 5 }}>
                CLIENTE
              </Text>
              <Text style={{ fontFamily: 'Playfair', fontSize: 18, color: C.dark }}>
                {draft.cliente}
              </Text>
            </View>
          ) : null}

          <Hr />

          <View style={{ flexDirection: 'row', gap: 36, marginTop: 4 }}>
            {totalVids > 0 && (
              <View>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, letterSpacing: 2, color: C.terra, marginBottom: 4 }}>
                  VÍDEOS
                </Text>
                <Text style={{ fontFamily: 'Playfair', fontWeight: 'bold', fontSize: 36, color: C.dark }}>
                  {totalVids}
                </Text>
              </View>
            )}
            {draft.plazo_estimado ? (
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, letterSpacing: 2, color: C.terra, marginBottom: 4 }}>
                  PLAZO DE ENTREGA
                </Text>
                <Text style={{ fontFamily: 'Playfair', fontSize: 18, color: C.dark }}>
                  {draft.plazo_estimado}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Placeholder imagen */}
        <View style={{ width: 148 }}>
          <ImgPlaceholder h={260} />
        </View>
      </View>

      <Footer />
    </Page>
  )
}

// ── Página 3 — Desglose de partidas ──────────────────────────────────────

function PageLineItems({ draft }: { draft: BudgetDraft }) {
  const total = draft.partidas.reduce((s, p) => s + p.cantidad * p.precio_unitario, 0)

  return (
    <Page size="A4" style={{ backgroundColor: C.cream, paddingHorizontal: 52, paddingTop: 48, paddingBottom: 60 }}>
      <SLabel>Desglose de partidas</SLabel>

      {/* Cabecera tabla */}
      <View style={{ flexDirection: 'row', backgroundColor: C.terra, paddingVertical: 9, paddingHorizontal: 10 }}>
        <Text style={{ flex: 3, fontFamily: 'Helvetica-Bold', fontSize: 7, letterSpacing: 1, color: C.cream }}>CONCEPTO</Text>
        <Text style={{ flex: 3, fontFamily: 'Helvetica-Bold', fontSize: 7, letterSpacing: 1, color: C.cream }}>DESCRIPCIÓN</Text>
        <Text style={{ width: 32, fontFamily: 'Helvetica-Bold', fontSize: 7, letterSpacing: 1, color: C.cream, textAlign: 'right' }}>UDS.</Text>
        <Text style={{ width: 60, fontFamily: 'Helvetica-Bold', fontSize: 7, letterSpacing: 1, color: C.cream, textAlign: 'right' }}>$/UD.</Text>
        <Text style={{ width: 62, fontFamily: 'Helvetica-Bold', fontSize: 7, letterSpacing: 1, color: C.cream, textAlign: 'right' }}>TOTAL</Text>
      </View>

      {/* Filas */}
      {draft.partidas.map((p, i) => (
        <View
          key={i}
          wrap={false}
          style={{
            flexDirection: 'row',
            paddingVertical: 10,
            paddingHorizontal: 10,
            backgroundColor: i % 2 === 0 ? C.cream : '#EAD9C6',
            borderBottomWidth: 0.5,
            borderBottomColor: '#89573730',
          }}
        >
          <Text style={{ flex: 3, fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.dark }}>{p.concepto}</Text>
          <Text style={{ flex: 3, fontFamily: 'Helvetica', fontSize: 9, color: C.med, lineHeight: 1.4 }}>{p.descripcion}</Text>
          <Text style={{ width: 32, fontFamily: 'Helvetica', fontSize: 9, color: C.dark, textAlign: 'right' }}>{p.cantidad}</Text>
          <Text style={{ width: 60, fontFamily: 'Helvetica', fontSize: 9, color: C.dark, textAlign: 'right' }}>{usd(p.precio_unitario)}</Text>
          <Text style={{ width: 62, fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.dark, textAlign: 'right' }}>{usd(p.cantidad * p.precio_unitario)}</Text>
        </View>
      ))}

      {/* Fila total */}
      <View style={{ flexDirection: 'row', backgroundColor: C.dark, paddingVertical: 13, paddingHorizontal: 10, marginTop: 2 }}>
        <Text style={{ flex: 9, fontFamily: 'Helvetica-Bold', fontSize: 8, letterSpacing: 1.5, color: C.terra }}>TOTAL</Text>
        <Text style={{ width: 62, fontFamily: 'Helvetica-Bold', fontSize: 14, color: C.cream, textAlign: 'right' }}>{usd(total)}</Text>
      </View>

      <Footer />
    </Page>
  )
}

// ── Página 4 — Inversión y forma de pago ─────────────────────────────────

function PageInvestment({ draft, formaPago }: { draft: BudgetDraft; formaPago?: string | null }) {
  const total   = draft.partidas.reduce((s, p) => s + p.cantidad * p.precio_unitario, 0)
  const payment = formaPago || 'Upfront (pago completo por adelantado)'

  return (
    <Page size="A4" style={{ backgroundColor: C.cream, paddingHorizontal: 52, paddingTop: 48, paddingBottom: 60 }}>
      <SLabel>Inversión</SLabel>

      {/* Bloque total */}
      <View style={{ backgroundColor: C.terra, paddingVertical: 36, paddingHorizontal: 32, alignItems: 'center', marginBottom: 28 }}>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, letterSpacing: 4, color: C.cream, opacity: 0.75, marginBottom: 12 }}>
          TOTAL
        </Text>
        <Text style={{ fontFamily: 'Playfair', fontWeight: 'bold', fontSize: 56, color: C.cream }}>
          {usd(total)}
        </Text>
      </View>

      <Hr />

      <View style={{ marginBottom: 22 }}>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, letterSpacing: 2.5, color: C.terra, marginBottom: 9 }}>
          FORMA DE PAGO
        </Text>
        <Text style={{ fontFamily: 'Helvetica', fontSize: 11, color: C.dark, lineHeight: 1.65 }}>
          {payment}
        </Text>
      </View>

      {draft.notas && draft.notas !== payment ? (
        <>
          <Hr />
          <View>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, letterSpacing: 2.5, color: C.terra, marginBottom: 9 }}>
              CONDICIONES
            </Text>
            <Text style={{ fontFamily: 'Helvetica', fontSize: 10, color: C.med, lineHeight: 1.7 }}>
              {draft.notas}
            </Text>
          </View>
        </>
      ) : null}

      <Footer />
    </Page>
  )
}

// ── Página 5 — Cierre ─────────────────────────────────────────────────────

function PageClosing() {
  return (
    <Page size="A4" style={{ backgroundColor: C.cream, flexDirection: 'column' }}>
      {/* Centro: "Gracias." */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 60 }}>
        <Text style={{ fontFamily: 'Playfair', fontWeight: 'bold', fontSize: 84, color: C.dark, textAlign: 'center' }}>
          Gracias.
        </Text>
        <Text style={{ fontFamily: 'Helvetica', fontSize: 12, color: C.med, textAlign: 'center', marginTop: 22, lineHeight: 1.7 }}>
          Estamos encantados de trabajar contigo.
        </Text>
      </View>

      {/* Bloque inferior terracota */}
      <View style={{ backgroundColor: C.terra, paddingVertical: 32, paddingHorizontal: 52 }}>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, letterSpacing: 4, color: C.cream, marginBottom: 10, opacity: 0.8 }}>
          THE MIND FLOW  ·  AI STUDIO
        </Text>
        <Text style={{ fontFamily: 'Helvetica', fontSize: 10, color: C.cream, lineHeight: 1.8 }}>
          themndflow.com
        </Text>
      </View>
    </Page>
  )
}

// ── Documento completo ────────────────────────────────────────────────────

interface BudgetDocProps {
  draft:     BudgetDraft
  formaPago?: string | null
  date:      string
}

function BudgetDocument({ draft, formaPago, date }: BudgetDocProps) {
  return (
    <Document title={draft.titulo || 'Presupuesto'} language="es" author="The Mind Flow AI Studio">
      <PageCover titulo={draft.titulo} cliente={draft.cliente} date={date} />
      <PageSummary draft={draft} />
      <PageLineItems draft={draft} />
      <PageInvestment draft={draft} formaPago={formaPago} />
      <PageClosing />
    </Document>
  )
}

export async function buildBudgetPDF(draft: BudgetDraft, formaPago?: string | null): Promise<Buffer> {
  const date = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
  return renderToBuffer(<BudgetDocument draft={draft} formaPago={formaPago} date={date} />) as Promise<Buffer>
}
