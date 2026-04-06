import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const FILE = path.join(process.cwd(), 'public/data/specials.json')

export async function GET() {
  try {
    const data = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf-8')) : []
    return NextResponse.json(data)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const existing = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf-8')) : []

    if (body._delete !== undefined) {
      const updated = existing.filter((_: unknown, i: number) => i !== body._delete)
      fs.writeFileSync(FILE, JSON.stringify(updated, null, 2))
      return NextResponse.json({ success: true })
    }

    const special = {
      ...body,
      id: `special_${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    existing.push(special)
    fs.writeFileSync(FILE, JSON.stringify(existing, null, 2))
    return NextResponse.json({ success: true, special })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
