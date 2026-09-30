import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const fallbackMove = (board) => board.findIndex((cell) => cell === '')

  const sendMove = (response, move) => {
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ move }))
  }

  return {
    plugins: [
      react(),
      {
        name: 'groq-ai-move',
        configureServer(server) {
          server.middlewares.use('/api/ai-move', async (request, response) => {
            if (request.method !== 'POST') {
              response.statusCode = 405
              response.end('Method Not Allowed')
              return
            }

            let body = ''
            request.on('data', (chunk) => {
              body += chunk
            })

            request.on('end', async () => {
              try {
                const { board } = JSON.parse(body)
                if (!Array.isArray(board) || board.length !== 9) {
                  throw new Error('Invalid board')
                }

                const emptyCells = board
                  .map((cell, index) => (cell === '' ? index : null))
                  .filter((index) => index !== null)

                if (emptyCells.length === 0) {
                  throw new Error('No moves available')
                }

                if (!env.GROQ_API_KEY || env.GROQ_API_KEY === 'your_groq_api_key_here') {
                  sendMove(response, fallbackMove(board))
                  return
                }

                const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${env.GROQ_API_KEY}`,
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
                if (!emptyCells.includes(move)) {
                  throw new Error('Groq returned an invalid move')
                }

                sendMove(response, move)
              } catch {
                try {
                  const { board } = JSON.parse(body)
                  sendMove(response, fallbackMove(board))
                } catch (fallbackError) {
                  response.statusCode = 400
                  response.end(fallbackError.message)
                }
              }
            })
          })
        },
      },
    ],
  }
})
