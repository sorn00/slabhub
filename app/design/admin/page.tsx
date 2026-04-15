import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { query } from '@/lib/db'
import type { Metadata } from 'next'
import DesignAdminClient from './DesignAdminClient'

export const metadata: Metadata = {
  title: 'Design Requests Admin | Quarriva',
  description: 'Admin view for kitchen design request submissions.',
  robots: { index: false, follow: false },
}

export interface DesignRequest {
  id: number
  name: string
  email: string
  phone: string | null
  city: string | null
  state: string | null
  room_type: string
  cabinet_style: string | null
  cabinet_finish: string | null
  stone_preference: string | null
  budget_range: string | null
  timeline: string | null
  room_width: string | null
  room_length: string | null
  notes: string | null
  sketch_url: string | null
  status: string
  created_at: string
  contacted_at: string | null
}

export default async function DesignAdminPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }
  const userRole = (session.user as { role?: string }).role
  if (userRole !== 'admin' && userRole !== 'reviewer') {
    redirect('/')
  }

  const rows = (await query(
    `SELECT * FROM design_requests ORDER BY created_at DESC LIMIT 200`
  )) as DesignRequest[]

  return <DesignAdminClient rows={rows} />
}
