import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import PricingClient from './PricingClient'

export default async function PricingPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const role = (session.user as { role?: string })?.role
  if (!['admin','va'].includes(role || '')) redirect('/crm')

  return <PricingClient userName={session.user?.name || ''} />
}
