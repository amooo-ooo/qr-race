import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { renderer } from './renderer'

const app = new Hono()

app.use(renderer)

const sessions: Record<string, any> = {}
const leaderboard: any[] = []
const adminSessions: Record<string, { eventName: string, loginTime: number }> = {}

// Simple admin credentials - in production, use environment variables and hashed passwords
const adminCredentials = {
  username: 'admin',
  password: 'admin123'
}

const eventData: Record<string, { orderedCodes: string[], clues: Record<string, string> }> = {
  'default': {
    orderedCodes: ['HEARTYHANGI', 'MUSSELMAD', 'ADAMSMALAY', 'PRICKLYPEAR'],
    clues: {
      HEARTYHANGI: 'Hearty Hangi: Tradition below ground and warm above',
      MUSSELMAD: 'Mussel Madness: Flex your crazy sea creature',
      ADAMSMALAY: 'Adam\'s Malaysian Noodles: First man\'s feast with a Southeast twist',
      PRICKLYPEAR: 'Prickly Pear: Spikes guard the sweetest secret',
    }
  }
}

const LeaderboardComponent = ({ showTitle = true }: { showTitle?: boolean }) => {
  const sorted = [...leaderboard].sort((a, b) => a.timeTaken - b.timeTaken)
  
  return (
    <div>
      {showTitle && <h2>Leaderboard</h2>}
      <ol>
        {sorted.map((u) => (
          <li key={u.email}>
            <span>{u.name}</span>: {(u.timeTaken / 1000).toFixed(1)} sec
          </li>
        ))}
        {sorted.length === 0 && <p>No one has finished the race yet!</p>}
      </ol>
    </div>
  )
}

app.post('/:event/start', async (c) => {
  const form = await c.req.formData()
  const name = form.get('name') as string
  const email = form.get('email') as string
  const eventName = c.req.param('event')

  const eventInfo = eventData[eventName]
  if (!eventInfo) {
    return c.render(<p>Event not found.</p>)
  }

  const sessionId = Math.random().toString(36).substring(2, 10)

  sessions[sessionId] = {
    name,
    email,
    startTime: Date.now(),
    currentClue: 0,
  }

  setCookie(c, 'sessionId', sessionId, {
    path: '/',
    httpOnly: true,
    sameSite: 'Strict',
    maxAge: 60 * 60 * 24
  })

  return c.redirect(`/${eventName}/qr/${eventInfo.orderedCodes[0]}`)
})

app.get('/:event/qr/:code', (c) => {
  const sessionId = getCookie(c, 'sessionId')

  if (!sessionId || !sessions[sessionId]) {
    return c.render(<p>Session not found. Please start again.</p>)
  }

  const eventName = c.req.param('event')
  const eventInfo = eventData[eventName]
  
  if (!eventInfo) {
    return c.render(<p>Event not found.</p>)
  }

  const code = c.req.param('code').toUpperCase()
  const clue = eventInfo.clues[code]
  if (!clue) return c.render(<p>Invalid QR code.</p>)

  const currentCodeIndex = eventInfo.orderedCodes.indexOf(code)
  const expectedIndex = sessions[sessionId].currentClue
  
  if (currentCodeIndex !== expectedIndex) {
    if (currentCodeIndex < expectedIndex) {
      return c.render(<p>You've already completed this clue! Please continue to the next one.</p>)
    } else {
      return c.render(<p>You must complete the clues in order! Please go back and complete the previous clue first.</p>)
    }
  }

  if (code === eventInfo.orderedCodes[eventInfo.orderedCodes.length - 1]) {
    const timeTaken = Date.now() - sessions[sessionId].startTime
    leaderboard.push({ ...sessions[sessionId], timeTaken })
    delete sessions[sessionId]
    
    deleteCookie(c, 'sessionId', { path: '/' });

    return c.render(
      <div>
        <h1>{clue}</h1>
        <p>Your time: <span>{(timeTaken / 1000).toFixed(1)}</span> seconds</p>
        
        <LeaderboardComponent showTitle={true} />
        
        <a href={`/${c.req.param('event')}`}>Start New Race</a>
      </div>
    )
  }

  const currentIndex = eventInfo.orderedCodes.indexOf(code)
  if (currentIndex >= 0) {
    sessions[sessionId].currentClue = currentIndex + 1
  }
  return c.render(<h1>{clue}</h1>)
})

app.get('/:event', (c) => {
  const eventName = c.req.param('event')
  const eventInfo = eventData[eventName]
    
  if (!eventInfo) {
    return c.render(<p>Event '{eventName}' not found.</p>)
  }

  return c.render(
    <div>
      <h1>Welcome to QR-Race!</h1>
      <form action={`/${eventName}/start`} method="post">
        <div>
            <input name="name" required placeholder="Team Name" />
        </div>
        <div>
            <input name="email" type="email" required placeholder="Email" />
        </div>
        <button type="submit">Start Race</button>
      </form>
      
      <LeaderboardComponent showTitle={true} />
    </div>
  )
})


export default app
