import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import FabricatorsClient from './FabricatorsClient'

export const revalidate = 300

async function getPartnerStats() {
  try {
    const claimed = await queryOne(
      "SELECT COUNT(*) as count FROM partner_markets WHERE status = 'claimed'"
    ) as { count: string } | null
    const available = await queryOne(
      "SELECT COUNT(*) as count FROM partner_markets WHERE status = 'available'"
    ) as { count: string } | null
    const pending = await queryOne(
      "SELECT COUNT(*) as count FROM partner_applications WHERE status = 'pending'"
    ) as { count: string } | null
    return {
      claimed: parseInt(claimed?.count ?? '0', 10),
      available: parseInt(available?.count ?? '0', 10),
      pending: parseInt(pending?.count ?? '0', 10),
    }
  } catch {
    return { claimed: 0, available: 0, pending: 0 }
  }
}

export default async function FabricatorsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const role = (session.user as { role?: string })?.role
  if (role !== 'admin') redirect('/crm')

  const partnerStats = await getPartnerStats()

  return <FabricatorsClient partnerStats={partnerStats} />
}
