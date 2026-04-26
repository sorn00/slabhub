import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { contactName, stage, currentMessage, thread, instruction } = await req.json()

  if (!instruction || !currentMessage) {
    return NextResponse.json({ error: 'Missing instruction or message' }, { status: 400 })
  }

  const stageLabels: Record<string, string> = {
    quote_sent: 'We sent them a quote and are following up',
    ready_for_templating: 'They are approved and need to schedule a templating appointment',
    templating_done: 'Templating is done and we need to schedule installation',
    sketch_received: 'We received their measurements and are preparing a quote',
  }
  const stageContext = stageLabels[stage] || stage

  const systemPrompt = `You are a helpful SMS assistant for Quarriva, a countertop marketplace.
You help rewrite outreach SMS messages to leads based on their instructions.
Keep messages:
- Conversational and warm, not salesy
- Under 160 characters when possible
- On-brand: friendly, professional, focused on helping the homeowner
- Never mention pricing unless it's already in the current message
Context for this lead: ${stageContext}`

  const userPrompt = `Contact: ${contactName}
${thread ? `Recent conversation:\n${thread}\n\n` : ''}Current draft message:
"${currentMessage}"

Instruction: ${instruction}

Rewrite the message following the instruction. Return ONLY the rewritten message text, nothing else.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 200,
      temperature: 0.7,
    })

    const message = completion.choices[0]?.message?.content?.trim()
    if (!message) return NextResponse.json({ error: 'No response from AI' }, { status: 500 })

    return NextResponse.json({ message })
  } catch (e) {
    console.error('AI rewrite error:', e)
    return NextResponse.json({ error: 'AI request failed' }, { status: 500 })
  }
}
