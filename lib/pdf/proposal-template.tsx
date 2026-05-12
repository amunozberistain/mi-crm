import React from 'react'
import { Document, Page, Text, View, Font, renderToBuffer } from '@react-pdf/renderer'
import type { ProposalContent } from '@/lib/ai/proposal'

// ── Fuentes ───────────────────────────────────────────────────────────────

Font.register({
  family: 'Playfair',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/playfair-display@5/files/playfair-display-latin-400-normal.woff2' },
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/playfair-display@5/files/playfair-display-latin-700-normal.woff2', fontWeight: 'bold' },
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

function Bullet({ children }: { children: string }) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: 6 }}>
      <Text style={{ fontFamily: 'Helvetica', fontSize: 9, color: C.terra, width: 14 }}>—</Text>
      <Text style={{ fontFamily: 'Helvetica', fontSize: 10, color: C.dark, lineHeight: 1.6, flex: 1 }}>{children}</Text>
    </View>
  )
}

// ── Página 1 — Portada ────────────────────────────────────────────────────

function PageCover({
  titulo, cliente, empresa, date,
}: {
  titulo: string; cliente: string | null; empresa: string | null; date: string
}) {
  return (
    <Page size="A4" style={{ backgroundColor: C.cream, flexDirection: 'column' }}>
      {/* Logo zone — ~28% of 842pt */}
      <View style={{ height: 236, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 52 }}>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 14, letterSpacing: 6, color: C.dark }}>
          THE MIND FLOW
        </Text>
        <Text style={{ fontFamily: 'Helvetica', fontSize: 9, letterSpacing: 3.5, color: C.med, marginTop: 5 }}>
          AI STUDIO
        </Text>
      </View>

      {/* Terracotta block — ~40% */}
      <View style={{ height: 337, backgroundColor: C.terra, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 64 }}>
        <Text style={{ fontFamily: 'Playfair', fontWeight: 'bold', fontSize: 48, color: C.cream, textAlign: 'center', lineHeight: 1.15 }}>
          {'Propuesta de\ncolaboración'}
        </Text>
        {titulo ? (
          <Text style={{ fontFamily: 'Helvetica', fontSize: 11, color: C.cream, textAlign: 'center', marginTop: 18, opacity: 0.85 }}>
            {titulo}
          </Text>
        ) : null}
      </View>

      {/* Bottom zone — client + date */}
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 56 }}>
        {cliente ? (
          <Text style={{ fontFamily: 'Playfair', fontWeight: 'bold', fontSize: 24, color: C.dark, marginBottom: 6 }}>
            {cliente}
          </Text>
        ) : null}
        {empresa ? (
          <Text style={{ fontFamily: 'Helvetica', fontSize: 10, color: C.med, marginBottom: 10 }}>
            {empresa}
          </Text>
        ) : null}
        <Text style={{ fontFamily: 'Helvetica', fontSize: 10, color: C.med, letterSpacing: 1 }}>
          {date}
        </Text>
      </View>
    </Page>
  )
}

// ── Página 2 — Sobre The Mind Flow ───────────────────────────────────────

function PageAbout() {
  return (
    <Page size="A4" style={{ backgroundColor: C.cream, paddingHorizontal: 52, paddingTop: 48, paddingBottom: 60 }}>
      <SLabel>Sobre The Mind Flow</SLabel>

      <View style={{ flexDirection: 'row', gap: 28, marginBottom: 24 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Playfair', fontWeight: 'bold', fontSize: 22, color: C.dark, lineHeight: 1.25, marginBottom: 16 }}>
            Tu fábrica de UGC con IA.
          </Text>
          <Text style={{ fontFamily: 'Helvetica', fontSize: 10, color: C.dark, lineHeight: 1.75, marginBottom: 14 }}>
            The Mind Flow AI Studio produce vídeos UGC hiperrealistas con avatares de inteligencia artificial, indistinguibles de personas reales, listos para escalar campañas en Meta Ads y otras plataformas de performance.
          </Text>
          <Text style={{ fontFamily: 'Helvetica', fontSize: 10, color: C.dark, lineHeight: 1.75 }}>
            Somos la solución para marcas que necesitan volumen de creatividades sin perder autenticidad ni calidad. Entregamos hasta 100 vídeos en 7 días, listos para activar en campaña el mismo día de entrega.
          </Text>
        </View>
        <View style={{ width: 148 }}>
          <ImgPlaceholder h={220} />
        </View>
      </View>

      <Hr />

      {/* Stats */}
      <View style={{ flexDirection: 'row', marginTop: 4, marginBottom: 20 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, letterSpacing: 2, color: C.terra, marginBottom: 4 }}>
            VÍDEOS / PROYECTO
          </Text>
          <Text style={{ fontFamily: 'Playfair', fontWeight: 'bold', fontSize: 34, color: C.dark }}>
            +100
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, letterSpacing: 2, color: C.terra, marginBottom: 4 }}>
            PLAZO DE ENTREGA
          </Text>
          <Text style={{ fontFamily: 'Playfair', fontWeight: 'bold', fontSize: 34, color: C.dark }}>
            7 días
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, letterSpacing: 2, color: C.terra, marginBottom: 4 }}>
            PRECIO DESDE
          </Text>
          <Text style={{ fontFamily: 'Playfair', fontWeight: 'bold', fontSize: 34, color: C.dark }}>
            $31/vid
          </Text>
        </View>
      </View>

      <Hr />

      <View>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, letterSpacing: 2, color: C.terra, marginBottom: 8 }}>
          NUESTRA GARANTÍA
        </Text>
        <Text style={{ fontFamily: 'Helvetica', fontSize: 10, color: C.dark, lineHeight: 1.65 }}>
          Si no entregamos en el plazo acordado, recibes vídeos adicionales sin coste. Sin excusas, sin letra pequeña.
        </Text>
      </View>

      <Footer />
    </Page>
  )
}

// ── Página 3 — Entendimiento del proyecto ────────────────────────────────

function PageUnderstanding({ data }: { data: ProposalContent }) {
  return (
    <Page size="A4" style={{ backgroundColor: C.cream, paddingHorizontal: 52, paddingTop: 48, paddingBottom: 60 }}>
      <SLabel>Entendimiento del proyecto</SLabel>

      <Text style={{ fontFamily: 'Helvetica', fontSize: 11, color: C.dark, lineHeight: 1.8, marginBottom: 22 }}>
        {data.resumen}
      </Text>

      {data.alcance.length > 0 && (
        <>
          <Hr />
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, letterSpacing: 2, color: C.terra, marginBottom: 12 }}>
            OBJETIVOS Y ALCANCE
          </Text>
          {data.alcance.map((item, i) => (
            <Bullet key={i}>{item}</Bullet>
          ))}
        </>
      )}

      <Footer />
    </Page>
  )
}

// ── Página 4 — Solución propuesta ────────────────────────────────────────

function PageSolution({ data }: { data: ProposalContent }) {
  return (
    <Page size="A4" style={{ backgroundColor: C.cream, paddingHorizontal: 52, paddingTop: 48, paddingBottom: 60 }}>
      <SLabel>Solución propuesta</SLabel>

      {data.entregables.length > 0 && (
        <View style={{ marginBottom: 22 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, letterSpacing: 2, color: C.terra, marginBottom: 12 }}>
            ENTREGABLES
          </Text>
          {data.entregables.map((item, i) => (
            <Bullet key={i}>{item}</Bullet>
          ))}
        </View>
      )}

      <Hr />

      <View style={{ flexDirection: 'row', gap: 28 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, letterSpacing: 2, color: C.terra, marginBottom: 10 }}>
            TIMELINE
          </Text>
          <Text style={{ fontFamily: 'Helvetica', fontSize: 10, color: C.dark, lineHeight: 1.65 }}>
            {data.cronograma}
          </Text>
        </View>
        <View style={{ width: 148 }}>
          <ImgPlaceholder h={180} />
        </View>
      </View>

      <Footer />
    </Page>
  )
}

// ── Página 5 — Inversión ─────────────────────────────────────────────────

function PageInvestment({ data }: { data: ProposalContent }) {
  return (
    <Page size="A4" style={{ backgroundColor: C.cream, paddingHorizontal: 52, paddingTop: 48, paddingBottom: 60 }}>
      <SLabel>Inversión</SLabel>

      {/* Total block */}
      <View style={{ backgroundColor: C.terra, paddingVertical: 36, paddingHorizontal: 32, alignItems: 'center', marginBottom: 28 }}>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, letterSpacing: 4, color: C.cream, opacity: 0.75, marginBottom: 12 }}>
          TOTAL
        </Text>
        <Text style={{ fontFamily: 'Playfair', fontWeight: 'bold', fontSize: 52, color: C.cream }}>
          {usd(data.inversion.total)}
        </Text>
      </View>

      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, letterSpacing: 2.5, color: C.terra, marginBottom: 9 }}>
          DESGLOSE
        </Text>
        <Text style={{ fontFamily: 'Helvetica', fontSize: 10, color: C.dark, lineHeight: 1.65 }}>
          {data.inversion.desglose}
        </Text>
      </View>

      <Hr />

      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, letterSpacing: 2.5, color: C.terra, marginBottom: 9 }}>
          FORMA DE PAGO
        </Text>
        <Text style={{ fontFamily: 'Helvetica', fontSize: 10, color: C.dark, lineHeight: 1.65 }}>
          {data.inversion.forma_de_pago}
        </Text>
      </View>

      {data.condiciones.length > 0 && (
        <>
          <Hr />
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, letterSpacing: 2.5, color: C.terra, marginBottom: 9 }}>
            CONDICIONES
          </Text>
          {data.condiciones.map((item, i) => (
            <Bullet key={i}>{item}</Bullet>
          ))}
        </>
      )}

      <Footer />
    </Page>
  )
}

// ── Página 6 — Cierre ─────────────────────────────────────────────────────

function PageClosing({ siguientePaso }: { siguientePaso: string }) {
  return (
    <Page size="A4" style={{ backgroundColor: C.cream, flexDirection: 'column' }}>
      {/* Center: "Hablemos." */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 64 }}>
        <Text style={{ fontFamily: 'Playfair', fontWeight: 'bold', fontSize: 80, color: C.dark, textAlign: 'center' }}>
          Hablemos.
        </Text>
        <Text style={{ fontFamily: 'Helvetica', fontSize: 11, color: C.med, textAlign: 'center', marginTop: 22, lineHeight: 1.7 }}>
          {siguientePaso}
        </Text>
      </View>

      {/* Bottom terracotta block */}
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

interface Props {
  data:           ProposalContent
  dealTitle:      string
  contactName:    string | null
  contactCompany: string | null
}

function ProposalDocument({ data, dealTitle, contactName, contactCompany }: Props) {
  const date = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <Document title={data.titulo || dealTitle} language="es" author="The Mind Flow AI Studio">
      <PageCover titulo={data.titulo || dealTitle} cliente={contactName} empresa={contactCompany} date={date} />
      <PageAbout />
      <PageUnderstanding data={data} />
      <PageSolution data={data} />
      <PageInvestment data={data} />
      <PageClosing siguientePaso={data.siguiente_paso} />
    </Document>
  )
}

export async function buildProposalPDF(props: Props): Promise<Buffer> {
  return renderToBuffer(<ProposalDocument {...props} />) as Promise<Buffer>
}
