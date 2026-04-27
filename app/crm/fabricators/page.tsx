import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
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
  const isAdminCookie = cookies().get('admin_session')?.value === 'valid'
  if (!session && !isAdminCookie) redirect('/admin/login?redirect=/crm/fabricators')

  const role = (session?.user as { role?: string } | undefined)?.role
  if (!isAdminCookie && !["admin","va"].includes(role || "")) redirect("/crm")

  const partnerStats = await getPartnerStats()

  return <FabricatorsClient partnerStats={partnerStats} />
}
