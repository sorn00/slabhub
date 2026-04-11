import type { Metadata } from 'next'
import PromoClient from './PromoClient'

export const metadata: Metadata = {
  title: 'Current Stone Promo | Arts Marble & Granite',
  description: 'Limited time promo — premium quartz slabs at special pricing. First come, first served. While supplies last.',
}

export default function PromoPage() {
  return <PromoClient />
}
