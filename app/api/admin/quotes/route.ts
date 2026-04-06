import { NextResponse } from 'next/server'
import fs from 'fs'

const FILE = '/tmp/quote-requests.json'

export async function GET() {
  try {
    const data = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf-8')) : []
    return NextResponse.json(Array.isArray(data) ? data : [])
  } catch {
    return NextResponse.json([])
  }
}
