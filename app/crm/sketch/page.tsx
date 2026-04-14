import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import SketchClient from './SketchClient'

export default async function SketchPage({
  searchParams,
}: {
  searchParams: Promise<{ contact?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const params = await searchParams
  const contactName = params.contact || ''

  return <SketchClient contactName={contactName} />
}
