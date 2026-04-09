import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdsPageClient from './AdsPageClient'

export default async function AdsPage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')
  if ((session.user as { role?: string }).role !== 'admin') redirect('/crm')

  return <AdsPageClient />
}
