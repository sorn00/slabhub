import type { Metadata } from 'next'
import PromoClient from './PromoClient'

export const metadata: Metadata = {
  title: 'Current Stone Promo | Arts Marble & Granite',
  description: 'Limited time MSI Classic Material promo — Grade B quartz slabs at unbeatable prices. First come, first served. No holds.',
}

export default function PromoPage() {
  return <PromoClient />
}
