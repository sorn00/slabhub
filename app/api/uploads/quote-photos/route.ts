import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { run } from '@/lib/db'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ urls: [] })
    }

    // Convert files to base64 data URLs and store in DB
    const urls: string[] = []
    for (const file of files.slice(0, 5)) {
      if (file.size > 10 * 1024 * 1024) continue // skip >10MB
      const bytes = await file.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')
      const dataUrl = `data:${file.type};base64,${base64}`

      // Store in a simple uploads table
      const result = await run(
        `INSERT INTO quote_photo_uploads (user_id, file_name, file_type, file_size, data_url, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
        [session.user.id, file.name, file.type, file.size, dataUrl]
      )
      // Return a reference URL
      urls.push(`/api/uploads/quote-photos/${result.rows[0].id}`)
    }

    return NextResponse.json({ urls })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
