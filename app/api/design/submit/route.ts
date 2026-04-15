import { NextRequest, NextResponse } from 'next/server'
import { run } from '@/lib/db'
import path from 'path'
import fs from 'fs/promises'

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData()

    const name = (fd.get('name') as string | null)?.trim() ?? ''
    const email = (fd.get('email') as string | null)?.trim() ?? ''
    const phone = (fd.get('phone') as string | null)?.trim() ?? null
    const city = (fd.get('city') as string | null)?.trim() ?? null
    const state = (fd.get('state') as string | null)?.trim() ?? null
    const room_type = (fd.get('room_type') as string | null)?.trim() ?? 'kitchen'
    const cabinet_style = (fd.get('cabinet_style') as string | null)?.trim() ?? null
    const cabinet_finish = (fd.get('cabinet_finish') as string | null)?.trim() ?? null
    const stone_preference = (fd.get('stone_preference') as string | null)?.trim() ?? null
    const budget_range = (fd.get('budget_range') as string | null)?.trim() ?? null
    const timeline = (fd.get('timeline') as string | null)?.trim() ?? null
    const room_width_raw = (fd.get('room_width') as string | null)?.trim()
    const room_length_raw = (fd.get('room_length') as string | null)?.trim()
    const notes = (fd.get('notes') as string | null)?.trim() ?? null
    const colorPref = (fd.get('color_preference') as string | null)?.trim() ?? null

    // Combine color preference into stone_preference or notes if needed
    const stoneNote = [
      stone_preference ? `Stone: ${stone_preference}` : null,
      colorPref ? `Color: ${colorPref}` : null,
    ]
      .filter(Boolean)
      .join(', ')

    const finalNotes = [stoneNote, notes].filter(Boolean).join('\n') || null

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 })
    }

    const room_width = room_width_raw ? parseFloat(room_width_raw) : null
    const room_length = room_length_raw ? parseFloat(room_length_raw) : null

    // Handle file upload (save filename only)
    let sketch_url: string | null = null
    const sketchFile = fd.get('sketch')
    if (sketchFile && sketchFile instanceof File && sketchFile.size > 0) {
      const ext = path.extname(sketchFile.name) || '.bin'
      const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'designs')
      await fs.mkdir(uploadDir, { recursive: true })
      const bytes = await sketchFile.arrayBuffer()
      await fs.writeFile(path.join(uploadDir, uniqueName), Buffer.from(bytes))
      sketch_url = `/uploads/designs/${uniqueName}`
    }

    const result = await run(
      `INSERT INTO design_requests
        (name, email, phone, city, state, room_type, cabinet_style, cabinet_finish,
         stone_preference, budget_range, timeline, room_width, room_length, notes, sketch_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id`,
      [
        name,
        email,
        phone,
        city,
        state,
        room_type,
        cabinet_style,
        cabinet_finish,
        stone_preference,
        budget_range,
        timeline,
        room_width,
        room_length,
        finalNotes,
        sketch_url,
      ]
    )

    const newId = (result.rows[0] as { id: number }).id

    return NextResponse.json({ success: true, id: newId })
  } catch (err) {
    console.error('[design/submit]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
