import { Context } from 'hono'

export interface Race {
  id?: number
  name: string
  email: string
  event_name: string
  start_time: number
  end_time?: number
  time_taken?: number
  current_clue: number
}

export interface Session {
  id: string
  name: string
  email: string
  event_name: string
  start_time: number
  current_clue: number
  created_at?: number
  updated_at?: number
}

export interface DBBindings {
  DB: D1Database
  SESSIONS: KVNamespace
}

export async function insertRace(c: Context<{ Bindings: DBBindings }>, race: Omit<Race, 'id'>): Promise<number> {
  const result = await c.env.DB.prepare(`
    INSERT INTO races (name, email, event_name, start_time, end_time, time_taken, current_clue)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    race.name,
    race.email,
    race.event_name,
    race.start_time,
    race.end_time || null,
    race.time_taken || null,
    race.current_clue
  ).run()

  return result.meta.last_row_id as number
}

export async function updateRaceProgress(c: Context<{ Bindings: DBBindings }>, email: string, eventName: string, currentClue: number): Promise<void> {
  await c.env.DB.prepare(`
    UPDATE races 
    SET current_clue = ? 
    WHERE email = ? AND event_name = ? AND end_time IS NULL
  `).bind(currentClue, email, eventName).run()
}

export async function finishRace(c: Context<{ Bindings: DBBindings }>, email: string, eventName: string, endTime: number, timeTaken: number): Promise<void> {
  await c.env.DB.prepare(`
    UPDATE races 
    SET end_time = ?, time_taken = ? 
    WHERE email = ? AND event_name = ? AND end_time IS NULL
  `).bind(endTime, timeTaken, email, eventName).run()
}

export async function getCompletedRaces(c: Context<{ Bindings: DBBindings }>, eventName: string): Promise<Race[]> {
  const result = await c.env.DB.prepare(`
    SELECT * FROM races 
    WHERE event_name = ? AND end_time IS NOT NULL 
    ORDER BY time_taken ASC
  `).bind(eventName).all()

  return result.results as unknown as Race[]
}

export async function getInProgressRaces(c: Context<{ Bindings: DBBindings }>, eventName: string): Promise<Race[]> {
  const result = await c.env.DB.prepare(`
    SELECT * FROM races 
    WHERE event_name = ? AND end_time IS NULL
  `).bind(eventName).all()

  return result.results as unknown as Race[]
}

export async function getRaceByEmailAndEvent(c: Context<{ Bindings: DBBindings }>, email: string, eventName: string): Promise<Race | null> {
  const result = await c.env.DB.prepare(`
    SELECT * FROM races 
    WHERE email = ? AND event_name = ? AND end_time IS NULL
    LIMIT 1
  `).bind(email, eventName).first()

  return result as Race | null
}

export async function getBestTimeForUser(c: Context<{ Bindings: DBBindings }>, email: string, eventName: string): Promise<number | null> {
  const result = await c.env.DB.prepare(`
    SELECT MIN(time_taken) as best_time 
    FROM races 
    WHERE email = ? AND event_name = ? AND end_time IS NOT NULL
  `).bind(email, eventName).first() as { best_time: number } | null

  return result?.best_time || null
}

export async function getLeaderboardByTeamName(c: Context<{ Bindings: DBBindings }>, eventName: string): Promise<Race[]> {
  const result = await c.env.DB.prepare(`
    SELECT name, email, event_name, MIN(time_taken) as time_taken, start_time, end_time, current_clue
    FROM races 
    WHERE event_name = ? AND end_time IS NOT NULL 
    GROUP BY name, event_name
    ORDER BY time_taken ASC
  `).bind(eventName).all()

  return result.results as unknown as Race[]
}

// KV-based session management functions
export async function createSessionKV(c: Context<{ Bindings: DBBindings }>, session: Session): Promise<void> {
  await c.env.SESSIONS.put(session.id, JSON.stringify(session), {
    expirationTtl: 60 * 60 * 24, // 24 hours TTL
  })
}

export async function getSessionKV(c: Context<{ Bindings: DBBindings }>, sessionId: string): Promise<Session | null> {
  const result = await c.env.SESSIONS.get(sessionId)
  return result ? JSON.parse(result) : null
}

export async function updateSessionKV(c: Context<{ Bindings: DBBindings }>, sessionId: string, updates: Partial<Session>): Promise<void> {
  const existingSession = await getSessionKV(c, sessionId)
  if (!existingSession) return
  
  const updatedSession = { ...existingSession, ...updates, updated_at: Date.now() }
  await c.env.SESSIONS.put(sessionId, JSON.stringify(updatedSession), {
    expirationTtl: 60 * 60 * 24, // 24 hours TTL
  })
}

export async function deleteSessionKV(c: Context<{ Bindings: DBBindings }>, sessionId: string): Promise<void> {
  await c.env.SESSIONS.delete(sessionId)
}

export function formatTime(timeInMs: number): string {
  if (!timeInMs || timeInMs < 0 || !isFinite(timeInMs)) {
    return '0s'
  }
  
  const totalSeconds = Math.floor(timeInMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  } else {
    return `${seconds}s`
  }
}

