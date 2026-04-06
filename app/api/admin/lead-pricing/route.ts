import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const FILE = path.join(process.cwd(), 'public/data/lead-pricing.json')

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
    const body: { state: string; price: number }[] = await req.json()
    fs.writeFileSync(FILE, JSON.stringify(body, null, 2))
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
