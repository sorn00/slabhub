import type { Metadata } from 'next'
import CabinetAdminClient from './CabinetAdminClient'

export const metadata: Metadata = {
  title: 'Cabinet Quote Requests — Admin | Quarriva',
}

export default function CabinetAdminPage() {
  return <CabinetAdminClient />
}
