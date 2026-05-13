import Stripe from 'stripe'
import { FORMA_PAGO_OPTIONS } from '@/lib/constants'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY no configurada')
  return new Stripe(key)
}

const IS_50_50 = FORMA_PAGO_OPTIONS[1]   // '50% inicio — 50% final'

export interface DealInvoiceInput {
  dealTitle:      string
  dealValue:      number        // en EUR
  formaPago:      string | null
  contactName:    string | null
  contactEmail:   string | null
}

export interface DealInvoiceResult {
  customerId:  string
  invoiceIds:  string[]         // 1 o 2 facturas según forma de pago
}

export async function createStripeCustomerAndInvoices(
  input: DealInvoiceInput
): Promise<DealInvoiceResult> {
  const stripe = getStripe()
  const { dealTitle, dealValue, formaPago, contactName, contactEmail } = input

  // ── 1. Buscar o crear cliente ─────────────────────────────────────────────
  let customerId: string

  if (contactEmail) {
    // Buscar por email para evitar duplicados
    const existing = await stripe.customers.list({ email: contactEmail, limit: 1 })
    if (existing.data.length > 0) {
      customerId = existing.data[0].id
      // Actualizar nombre si ha cambiado
      if (contactName && existing.data[0].name !== contactName) {
        await stripe.customers.update(customerId, { name: contactName })
      }
    } else {
      const customer = await stripe.customers.create({
        email: contactEmail,
        name:  contactName ?? undefined,
      })
      customerId = customer.id
    }
  } else {
    // Sin email: crear cliente sólo con nombre
    const customer = await stripe.customers.create({
      name: contactName ?? dealTitle,
    })
    customerId = customer.id
  }

  // ── 2. Crear facturas ─────────────────────────────────────────────────────
  const amountCents = Math.round(dealValue * 100)
  const invoiceIds: string[] = []

  if (formaPago === IS_50_50) {
    // Dos facturas de borrador: 50% ahora + 50% al cierre
    const half = Math.round(amountCents / 2)

    for (const [label, amount] of [
      [`${dealTitle} — 50% inicio`, half],
      [`${dealTitle} — 50% final`,  amountCents - half],   // evita redondeo
    ] as [string, number][]) {
      await stripe.invoiceItems.create({
        customer:    customerId,
        amount,
        currency:    'eur',
        description: label,
      })
      const inv = await stripe.invoices.create({
        customer:           customerId,
        auto_advance:       false,          // queda como borrador
        collection_method:  'send_invoice',
        days_until_due:     30,
        description:        label,
      })
      invoiceIds.push(inv.id)
    }
  } else {
    // Pago único (Upfront o sin especificar)
    const description = formaPago
      ? `${dealTitle} — ${formaPago}`
      : dealTitle

    await stripe.invoiceItems.create({
      customer:    customerId,
      amount:      amountCents,
      currency:    'eur',
      description,
    })
    const inv = await stripe.invoices.create({
      customer:          customerId,
      auto_advance:      false,
      collection_method: 'send_invoice',
      days_until_due:    30,
      description,
    })
    invoiceIds.push(inv.id)
  }

  return { customerId, invoiceIds }
}
