import { NextRequest, NextResponse } from 'next/server'
import { run } from '@/lib/db'
import { writeFile } from 'fs/promises'
import path from 'path'
import fs from 'fs'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Admin-only: must have valid admin_session cookie
  const adminSession = req.cookies.get('admin_session')
  if (adminSession?.value !== 'valid') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const quoteId = parseInt(params.id)
  if (isNaN(quoteId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
  }

  // Save to uploads directory
  const uploadsDir = path.join(process.cwd(), 'uploads')
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  const filename = `quote-${quoteId}-${Date.now()}.pdf`
  const filepath = path.join(uploadsDir, filename)
  const bytes = await file.arrayBuffer()
  await writeFile(filepath, Buffer.from(bytes))

  // Save to DB (replace existing if any)
  await run('DELETE FROM quote_files WHERE quote_request_id = $1', [quoteId])
  await run(
    'INSERT INTO quote_files (quote_request_id, filename, original_name) VALUES ($1, $2, $3)',
    [quoteId, filename, file.name]
  )

  // Update quote status
  await run("UPDATE quote_requests SET status = 'quoted' WHERE id = $1", [quoteId])

  return NextResponse.json({ success: true, filename })
}
