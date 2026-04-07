import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getContactById, getContactMessages, getConversationByContact } from '@/lib/ghl-db'
import ComposeClient from './ComposeClient'

interface Props {
  params: { contactId: string }
}

export default async function ComposePage({ params }: Props) {
  const session = await auth()
  if (!session) {
    redirect('/login')
  }

  const userRole = (session.user as { role?: string }).role || 'reviewer'

  let contact = null
  let messages: ReturnType<typeof getContactMessages> = []
  let conversation = null

  try {
    contact = getContactById(params.contactId)
    messages = getContactMessages(params.contactId, 10)
    conversation = getConversationByContact(params.contactId)
  } catch {
    // GHL DB might be unavailable
  }

  return (
    <ComposeClient
      contactId={params.contactId}
      contact={contact}
      messages={messages}
      conversationId={conversation?.id || null}
      isAdmin={userRole === 'admin'}
      userName={session.user?.name || ''}
    />
  )
}
