import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import { readFile } from 'fs/promises'
import path from 'path'
import fs from 'fs'

export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { filename } = params
  if (!filename || !filename.endsWith('.pdf')) {
    return NextResponse.json({ error: 'Invalid file' }, { status: 400 })
  }

  // Verify this quote file belongs to the requesting user or admin
  const adminSession = req.cookies.get('admin_session')
  const isAdmin = adminSession?.value === 'valid'

  if (!isAdmin) {
    const fileRecord = await queryOne(`
      SELECT qf.* FROM quote_files qf
      JOIN quote_requests qr ON qr.id = qf.quote_request_id
      WHERE qf.filename = $1 AND qr.user_id = $2
    `, [filename, session.user.id])

    if (!fileRecord) {
      return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 })
    }
  }

  const filepath = path.join(process.cwd(), 'uploads', filename)
  if (!fs.existsSync(filepath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const fileBuffer = await readFile(filepath)
  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
