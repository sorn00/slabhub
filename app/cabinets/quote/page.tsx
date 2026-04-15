import type { Metadata } from 'next'
import CabinetQuoteClient from './CabinetQuoteClient'

export const metadata: Metadata = {
  title: 'Request a Cabinet Quote | Quarriva',
  description:
    'Get a custom cabinet quote from Quarriva. Tell us your project details and we\'ll respond within 24 hours with pricing and availability.',
}

export default function CabinetQuotePage() {
  return <CabinetQuoteClient />
}
