import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import LeadsClient from './LeadsClient'

export default async function LeadsPage() {
  const session = await auth()
  if (!session) {
    redirect('/login')
  }

  const userRole = (session.user as { role?: string }).role || 'reviewer'

  return <LeadsClient isAdmin={userRole === 'admin'} />
}
