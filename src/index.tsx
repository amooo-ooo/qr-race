import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { renderer } from './renderer'
import { 
  DBBindings, 
  Race, 
  Session,
  insertRace,
  updateRaceProgress,
  finishRace,
  getCompletedRaces,
  getInProgressRaces,
  getRaceByEmailAndEvent,
  getBestTimeForUser,
  getLeaderboardByTeamName,
  createSessionKV,
  getSessionKV,
  updateSessionKV,
  deleteSessionKV,
  formatTime
} from './db'

const app = new Hono<{ Bindings: DBBindings }>()

app.use(renderer)

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
    orderedCodes: ['9Y1X3W5V', '4U7T9S6R', '8Q5P7O3N', '6M2L4K1J', '2P8L3N9K', '7B4F6A1D', '5H9G2J3C', '1E6K8M7Q0', '3A2B1C4D'],
    clues: {
      '9Y1X3W5V': "Fried croquettes, pastels, and a taste of Brazil.", // Brazil in a Box
      '4U7T9S6R': "Pies, pasties, and toasties made with heart.", // Heart & Soul Kitchen
      '8Q5P7O3N': "Fast bites, Korean fried crunch done right.", // JAEJU
      '6M2L4K1J': "Sweet forest magic stacked on waffles.", // Black Forest Waffle Hut
      '2P8L3N9K': "Tradition below ground and warm above.", // Hearty Hangi
      '7B4F6A1D': "Flex your crazy sea creature.", // Mussel Madness
      '5H9G2J3C': "First man's feast with a Southeast twist.", // Adams Malay
      '1E6K8M7Q': "Spikes guard the sweetest secret.", // Prickly Pear
      '3A2B1C4D': "You've reached the end! Run back to the UC Global Leaders stall to finish the race!."
    }
  }
}

const LeaderboardComponent = ({
  showTitle = true,
  highlightEmail = '',
  completedRaces = [],
  inProgressRaces = []
}: { 
  showTitle?: boolean; 
  highlightEmail?: string;
  completedRaces?: Race[];
  inProgressRaces?: Race[];
}) => {
  const sorted = [...completedRaces].sort((a, b) => (a.time_taken || 0) - (b.time_taken || 0))

  return (
    <div>
      {showTitle && <h2>Leaderboard</h2>}
      <ol>
        {sorted.map((race) => (
          <li
            key={race.email}
            className={highlightEmail && race.email === highlightEmail ? 'leaderboard-highlight' : undefined}
          >
            <span>{race.name}</span>: {formatTime(race.time_taken || 0)}
          </li>
        ))}
        {inProgressRaces.map((race) => (
          <li
            key={race.email}
            className="leaderboard-inprogress"
          >
            <span>{race.name}</span>: In Progress
          </li>
        ))}
        {sorted.length === 0 && inProgressRaces.length === 0 && <p>No one has finished the race yet!</p>}
      </ol>
    </div>
  )
}

app.post('/:event/start', async (c) => {
  const form = await c.req.formData()
  const name = form.get('name')?.toString().trim() || ''
  const email = form.get('email')?.toString().trim().toLowerCase() || ''
  const eventName = c.req.param('event')

  const eventInfo = eventData[eventName]
  if (!eventInfo) {
    return c.render(<p>Event not found.</p>)
  }

  if (!name || !email) {
    return c.render(<p>Name and email are required.</p>)
  }

  const existingRace = await getRaceByEmailAndEvent(c, email, eventName)
  
  const sessionId = Math.random().toString(36).substring(2, 10)
  let startTime = Date.now()
  let currentClue = 0

  if (existingRace) {
    startTime = existingRace.start_time
    currentClue = existingRace.current_clue
  } else {
    await insertRace(c, {
      name,
      email,
      event_name: eventName,
      start_time: startTime,
      current_clue: 0
    })
  }

  await createSessionKV(c, {
    id: sessionId,
    name,
    email,
    event_name: eventName,
    start_time: startTime,
    current_clue: currentClue,
  })

  setCookie(c, 'sessionId', sessionId, {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24
  })

  const nextClueIndex = currentClue
  return c.redirect(`/${eventName}/qr/${eventInfo.orderedCodes[nextClueIndex]}`)
})

app.get('/:event/qr/:code', async (c) => {
  const sessionId = getCookie(c, 'sessionId')

  if (!sessionId) {
    return c.redirect(`/${c.req.param('event')}`)
  }

  const session = await getSessionKV(c, sessionId)
  
  if (!session) {
    return c.redirect(`/${c.req.param('event')}`)
  }

  const eventName = c.req.param('event')
  const eventInfo = eventData[eventName]
  
  if (!eventInfo) {
    return c.render(<p>Event not found.</p>)
  }

  if (session.event_name !== eventName) {
    return c.redirect(`/${eventName}`)
  }

  const code = c.req.param('code').toUpperCase()
  const clue = eventInfo.clues[code]
  if (!clue) return c.render(<p>Invalid QR code.</p>)

  const currentCodeIndex = eventInfo.orderedCodes.indexOf(code)
  const expectedIndex = session.current_clue
  const totalClues = eventInfo.orderedCodes.length
  const clueNumber = currentCodeIndex + 1

  if (currentCodeIndex === eventInfo.orderedCodes.length - 1 && currentCodeIndex === expectedIndex) {
    const existingRace = await getRaceByEmailAndEvent(c, session.email, eventName)
    if (existingRace && existingRace.end_time) {
      return c.redirect(`/${eventName}/leaderboard`)
    }
    
    const timeTaken = Date.now() - session.start_time
    
    await finishRace(c, session.email, eventName, Date.now(), timeTaken)
    await deleteSessionKV(c, sessionId)
    
    const completedRaces = await getLeaderboardByTeamName(c, eventName)
    const inProgressRaces = await getInProgressRaces(c, eventName)

    deleteCookie(c, 'sessionId', { path: '/' });

    return c.render(
      <div>
        <div className="clue-tag">
          Clue {clueNumber}/{totalClues}
        </div>  
        <h1>{clue}</h1>
        <p> Congratulations! You finished the treasure hunt! Your time: <span>{formatTime(timeTaken)}</span>.</p>
        <LeaderboardComponent 
          showTitle={true} 
          highlightEmail={session.email} 
          completedRaces={completedRaces}
          inProgressRaces={inProgressRaces}
        />
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
    const newClueIndex = currentCodeIndex + 1
    await updateSessionKV(c, sessionId, { current_clue: newClueIndex })
    await updateRaceProgress(c, session.email, eventName, newClueIndex)
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

app.get('/:event', async (c) => {
  const eventName = c.req.param('event')
  const eventInfo = eventData[eventName]
    
  if (!eventInfo) {
    return c.render(<p>Event '{eventName}' not found.</p>)
  }

  const completedRaces = await getLeaderboardByTeamName(c, eventName)
  const inProgressRaces = await getInProgressRaces(c, eventName)
  
  const teamNames = completedRaces.map((race: Race) => race.name)
  
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
              data-team-names={encodeURIComponent(JSON.stringify(teamNames.map((name: string) => name.toLowerCase())))}
            />
        </div>
        <div>
            <input name="email" type="email" required placeholder="Email" />
        </div>
        <button type="submit" id="race-submit-btn">Start Race</button>
      </form>
      <LeaderboardComponent 
        showTitle={true} 
        completedRaces={completedRaces}
        inProgressRaces={inProgressRaces}
      />
    </div>
  )
})

export default app