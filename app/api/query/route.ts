import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  const { question, streams } = await req.json()

  const client = new Anthropic()

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `You are a performance analyst for MajorForm, a Singapore digital marketing agency.
You have access to livestream campaign data including streamers, brands, GMV, timeslots, and platforms.
Answer questions about performance, trends, and patterns. Be concise. Format currency as SGD.
When ranking streamers or brands, be explicit. Reference specific numbers.`,
    messages: [
      {
        role: 'user',
        content: `Here is the livestream campaign data (${streams.length} streams):\n\n${JSON.stringify(streams)}\n\nQuestion: ${question}`,
      },
    ],
  })

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(new TextEncoder().encode(chunk.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
