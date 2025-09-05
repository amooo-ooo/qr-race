import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { renderer } from './renderer'

const app = new Hono()

app.use(renderer)

const sessions: Record<string, any> = {}
const leaderboard: any[] = []

interface EventInfo {
  title: string
  description: string
  host: string
  orderedCodes: string[]
  clues: Record<string, string>
}

const eventData: Record<string, EventInfo> = {
  'global-leaders': {
    title: 'Riccarton Market Amazing Race',
    description: 'Team up with your friends or go solo for an Amazing Race tour around Riccarton Market, hosted by the UC Global Leaders. Scan each QR code to get a hint leading to the next one. Complete the course as fast as you can and the quickest time wins a reward.',
    host: 'UC Global Leaders',
    orderedCodes: ['HEARTYHANGI', 'MUSSELMAD', 'ADAMSMALAY', 'PRICKLYPEAR'],
    clues: {
      HEARTYHANGI: 'Hearty Hangi: Tradition below ground and warm above',
      MUSSELMAD: 'Mussel Madness: Flex your crazy sea creature',
      ADAMSMALAY: 'Adam\'s Malaysian Noodles: First man\'s feast with a Southeast twist',
      PRICKLYPEAR: 'Prickly Pear: Spikes guard the sweetest secret',
    }
  }
}

const LeaderboardComponent = ({
  showTitle = true,
  highlightEmail = ''
}: { showTitle?: boolean; highlightEmail?: string }) => {
  const sorted = [...leaderboard].sort((a, b) => a.timeTaken - b.timeTaken)

  const inProgressTeams = Object.values(sessions)
    .filter(s => s.name && s.email)
    .map(s => ({ name: s.name, email: s.email }))

  return (
    <div>
      {showTitle && <h2>Leaderboard</h2>}
      <ol>
        {sorted.map((u) => (
          <li
            key={u.email}
            className={highlightEmail && u.email === highlightEmail ? 'leaderboard-highlight' : undefined}
          >
            <span>{u.name}</span>: {(u.timeTaken / 1000).toFixed(1)} sec
          </li>
        ))}
        {inProgressTeams.map((u) => (
          <li
            key={u.email}
            className="leaderboard-inprogress"
          >
            <span>{u.name}</span>: In Progress
          </li>
        ))}
        {sorted.length === 0 && inProgressTeams.length === 0 && <p>No one has finished the race yet!</p>}
      </ol>
    </div>
  )
}

app.post('/:event/start', async (c) => {
  const form = await c.req.formData()
  const name = form.get('name').trim()
  const email = form.get('email').trim()
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
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24
  })

  return c.redirect(`/${eventName}/qr/${eventInfo.orderedCodes[0]}`)
})

app.get('/:event/qr/:code', (c) => {
  const sessionId = getCookie(c, 'sessionId')

  if (!sessionId || !sessions[sessionId]) {
    return c.redirect(`/${c.req.param('event')}`)
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
  const totalClues = eventInfo.orderedCodes.length
  const clueNumber = currentCodeIndex + 1

  if (currentCodeIndex === eventInfo.orderedCodes.length - 1 && currentCodeIndex === expectedIndex) {
    const timeTaken = Date.now() - sessions[sessionId].startTime
    const user = { ...sessions[sessionId], timeTaken }

    const existingIdx = leaderboard.findIndex(u => u.email === user.email)
    if (existingIdx !== -1) {
      if (timeTaken < leaderboard[existingIdx].timeTaken) {
        leaderboard[existingIdx] = user
      }
    } else {
      leaderboard.push(user)
    }

    delete sessions[sessionId]
    deleteCookie(c, 'sessionId', { path: '/' });

    return c.render(
      <div>
        <div className="clue-tag">
          Clue {clueNumber}/{totalClues}
        </div>  
        <h1>{clue}</h1>
        <p> Congratulations! You finished the treasure hunt! Your time: <span>{(timeTaken / 1000).toFixed(1)}</span> seconds.</p>
        <LeaderboardComponent showTitle={true} highlightEmail={user.email} />
        {/* <a href={`/${c.req.param('event')}`}>Start New Race</a> */}
      </div>
    )
  }

  if (currentCodeIndex < expectedIndex) {
    return c.render(
      <div>
        <div className="clue-tag">
          Clue {clueNumber}/{totalClues}
        </div>
        <h1>{clue}</h1>
        <div class="clue-completed-message">
          You've already completed this clue! Please continue to the next one.
        </div>
      </div>
    )
  }

  if (currentCodeIndex > expectedIndex) {
    return c.render(<p>You must complete the clues in order! Please go back and complete the previous clue first.</p>)
  }

  if (currentCodeIndex >= 0) {
    sessions[sessionId].currentClue = currentCodeIndex + 1
  }
  return c.render(
    <div>
      <div className="clue-tag">
        Clue {clueNumber}/{totalClues}
      </div>
      <h1>{clue}</h1>
    </div>
  )
})

app.get('/:event', (c) => {
  const eventName = c.req.param('event')
  const eventInfo = eventData[eventName]
    
  if (!eventInfo) {
    return c.render(<p>Event '{eventName}' not found.</p>)
  }

  const teamNames = leaderboard.map(u => u.name)
  return c.render(
    <div>
      <head>
        <title>{eventInfo.title} - {eventInfo.host}</title>
      </head>
      <h1>Welcome to the {eventInfo.title}!</h1>
      <p>{eventInfo.description}</p>
      <form action={`/${eventName}/start`} method="post" id="race-form">
        <div>
            <input
              name="name"
              required
              placeholder="Team Name"
              id="team-name-input"
              autoComplete="off"
              data-team-names={encodeURIComponent(JSON.stringify(teamNames.map(n => n.toLowerCase())))}
            />
        </div>
        <div>
            <input name="email" type="email" required placeholder="Email" />
        </div>
        <button type="submit" id="race-submit-btn">Start Race</button>
      </form>
      <LeaderboardComponent showTitle={true} />
    </div>
  )
})

export default app