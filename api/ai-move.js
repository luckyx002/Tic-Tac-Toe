const fallbackMove = (board) => board.findIndex((cell) => cell === '')

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' })
  }

  let board
  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body
    board = body?.board
  } catch {
    return response.status(400).json({ error: 'Invalid request' })
  }

  if (
    !Array.isArray(board) ||
    board.length !== 9 ||
    board.some((cell) => !['', 'X', 'O'].includes(cell))
  ) {
    return response.status(400).json({ error: 'Invalid board' })
  }

  const emptyCells = board
    .map((cell, index) => (cell === '' ? index : null))
    .filter((index) => index !== null)

  if (emptyCells.length === 0) {
    return response.status(400).json({ error: 'No moves available' })
  }

  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here') {
    return response.status(200).json({ move: fallbackMove(board) })
  }

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 20,
        messages: [
          {
            role: 'system',
            content:
              'You play tic-tac-toe as O. Return only one integer from 0 to 8 for an empty square. Never return any other text.',
          },
          {
            role: 'user',
            content: `Board indexes are 0-8. Current board: ${JSON.stringify(board)}. Choose an empty index.`,
          },
        ],
      }),
    })

    if (!groqResponse.ok) {
      throw new Error(`Groq request failed: ${groqResponse.status}`)
    }

    const data = await groqResponse.json()
    const move = Number.parseInt(data.choices?.[0]?.message?.content?.trim(), 10)

    return response.status(200).json({
      move: emptyCells.includes(move) ? move : fallbackMove(board),
    })
  } catch {
    return response.status(200).json({ move: fallbackMove(board) })
  }
}