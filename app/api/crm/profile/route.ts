import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { queryOne, run } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await queryOne(
    'SELECT id, name, email, role FROM users WHERE email = $1',
    [session.user.email]
  ) as { id: number; name: string; email: string; role: string } | null

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name, currentPassword, newPassword } = body

  const user = await queryOne(
    'SELECT * FROM users WHERE email = $1',
    [session.user.email]
  ) as { id: number; name: string; email: string; password_hash: string; role: string } | null

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Update name if provided
  if (name && name.trim() && name.trim() !== user.name) {
    await run('UPDATE users SET name = $1 WHERE email = $2', [name.trim(), session.user.email])
  }

  // Update password if provided
  if (currentPassword || newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
    }
    if (!newPassword) {
      return NextResponse.json({ error: 'New password is required' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    const hash = await bcrypt.hash(newPassword, 12)
    await run('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, session.user.email])
  }

  return NextResponse.json({ success: true })
}
