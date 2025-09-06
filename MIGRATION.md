# Database Migration Script

This file contains the setup commands for your QR Race application with D1 database and KV storage.

## Current Architecture (Updated)

- **D1 Database**: Stores race results and leaderboard data
- **KV Storage**: Handles session management for better performance
- **No unique constraints**: Allows multiple attempts per user with best-time tracking

## Local Development

### Step 1: Set up D1 Database

```bash
# Create the races table (no unique constraint for multiple attempts)
wrangler d1 execute qr-race-db --command "CREATE TABLE races (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, event_name TEXT NOT NULL, start_time INTEGER NOT NULL, end_time INTEGER, time_taken INTEGER, current_clue INTEGER DEFAULT 0);"
```

### Step 2: Set up KV Namespace

```bash
# Create KV namespace for sessions
wrangler kv namespace create "SESSIONS"

# Add the returned binding to wrangler.jsonc:
# "kv_namespaces": [
#   {
#     "binding": "SESSIONS", 
#     "id": "your-kv-namespace-id"
#   }
# ]
```

## Production Deployment

### Step 1: D1 Database

```bash
# Create the races table on remote database
wrangler d1 execute qr-race-db --remote --command "CREATE TABLE races (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, event_name TEXT NOT NULL, start_time INTEGER NOT NULL, end_time INTEGER, time_taken INTEGER, current_clue INTEGER DEFAULT 0);"
```

### Step 2: KV Namespace

```bash
# Create KV namespace for production
wrangler kv namespace create "SESSIONS"
```

## Database Schema

### races table (D1)

| Column      | Type    | Description                                    |
|-------------|---------|------------------------------------------------|
| id          | INTEGER | Primary key, auto-incrementing                |
| name        | TEXT    | Team/participant name                          |
| email       | TEXT    | Team/participant email                         |
| event_name  | TEXT    | Name of the event (e.g., 'global-leaders')    |
| start_time  | INTEGER | Unix timestamp when race started              |
| end_time    | INTEGER | Unix timestamp when race ended (NULL if ongoing) |
| time_taken  | INTEGER | Total time in milliseconds (NULL if ongoing)  |
| current_clue| INTEGER | Current clue index (0-based)                  |

### Session Storage (KV)

Sessions are stored in KV with:
- **Key**: Session ID (random string)
- **Value**: JSON object with session data
- **TTL**: 24 hours automatic expiration

```typescript
interface Session {
  id: string
  name: string
  email: string
  event_name: string
  start_time: number
  current_clue: number
  created_at?: number
  updated_at?: number
}
```

## Key Features

### Multiple Attempts Support
- ✅ Users can retry races multiple times
- ✅ Leaderboard shows best time per team name
- ✅ No duplicate team names on leaderboard

### Session Persistence
- ✅ Sessions stored in KV for better performance
- ✅ Automatic 24-hour expiration
- ✅ Survives application deployments
- ✅ Global edge distribution

### Best Time Tracking
- ✅ Leaderboard groups by team name, shows best attempt
- ✅ SQL query: `GROUP BY name, event_name` with `MIN(time_taken)`

## Database Reset Commands

### WARNING: The following commands will permanently delete ALL data

### Reset D1 Database (Local Development)

```bash
# Delete all races data
wrangler d1 execute qr-race-db --command "DELETE FROM races;"

# Reset auto-increment counter
wrangler d1 execute qr-race-db --command "DELETE FROM sqlite_sequence WHERE name='races';"

# Alternatively, drop and recreate the table completely
wrangler d1 execute qr-race-db --command "DROP TABLE IF EXISTS races;"
wrangler d1 execute qr-race-db --command "CREATE TABLE races (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, event_name TEXT NOT NULL, start_time INTEGER NOT NULL, end_time INTEGER, time_taken INTEGER, current_clue INTEGER DEFAULT 0);"
```

### Reset D1 Database (Production)

```bash
# Delete all races data (PRODUCTION)
wrangler d1 execute qr-race-db --remote --command "DELETE FROM races;"

# Reset auto-increment counter (PRODUCTION)
wrangler d1 execute qr-race-db --remote --command "DELETE FROM sqlite_sequence WHERE name='races';"

# Alternatively, drop and recreate the table completely (PRODUCTION)
wrangler d1 execute qr-race-db --remote --command "DROP TABLE IF EXISTS races;"
wrangler d1 execute qr-race-db --remote --command "CREATE TABLE races (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, event_name TEXT NOT NULL, start_time INTEGER NOT NULL, end_time INTEGER, time_taken INTEGER, current_clue INTEGER DEFAULT 0);"
```

### Reset KV Storage (Sessions)

```bash
# Get your KV namespace ID from wrangler.jsonc, then run:

# List all keys in the SESSIONS namespace (to see what will be deleted)
wrangler kv key list --namespace-id=YOUR_SESSIONS_NAMESPACE_ID

# Delete all sessions (WARNING: This deletes ALL session data)
# Note: There's no bulk delete, so you'll need to delete individually or use a script

# Option 1: Delete specific keys one by one
wrangler kv key delete "session-key-here" --namespace-id=YOUR_SESSIONS_NAMESPACE_ID

# Option 2: Create a script to delete all keys
# First, list all keys and save to a file:
wrangler kv key list --namespace-id=YOUR_SESSIONS_NAMESPACE_ID > keys.json

# Then create a script to delete each key (example in PowerShell):
# $keys = Get-Content keys.json | ConvertFrom-Json
# foreach ($key in $keys) {
#     wrangler kv key delete $key.name --namespace-id=YOUR_SESSIONS_NAMESPACE_ID
# }
```

### Complete Reset Script (PowerShell)

```powershell
# Complete database reset for local development
Write-Host "Resetting D1 Database (Local)..."
wrangler d1 execute qr-race-db --command "DELETE FROM races;"
wrangler d1 execute qr-race-db --command "DELETE FROM sqlite_sequence WHERE name='races';"

Write-Host "Clearing KV Sessions..."
# Get namespace ID from wrangler.jsonc
$kvKeys = wrangler kv key list --namespace-id=YOUR_SESSIONS_NAMESPACE_ID | ConvertFrom-Json
foreach ($key in $kvKeys) {
    wrangler kv key delete $key.name --namespace-id=YOUR_SESSIONS_NAMESPACE_ID
    Write-Host "Deleted session: $($key.name)"
}

Write-Host "Database reset complete!"
```

### Complete Reset Script (Bash)

```bash
#!/bin/bash
# Complete database reset for local development

echo "Resetting D1 Database (Local)..."
wrangler d1 execute qr-race-db --command "DELETE FROM races;"
wrangler d1 execute qr-race-db --command "DELETE FROM sqlite_sequence WHERE name='races';"

echo "Clearing KV Sessions..."
# Get namespace ID from wrangler.jsonc
NAMESPACE_ID="YOUR_SESSIONS_NAMESPACE_ID"
wrangler kv key list --namespace-id=$NAMESPACE_ID | jq -r '.[].name' | while read key; do
    wrangler kv key delete "$key" --namespace-id=$NAMESPACE_ID
    echo "Deleted session: $key"
done

echo "Database reset complete!"
```

### Verification Commands

```bash
# Verify D1 database is empty
wrangler d1 execute qr-race-db --command "SELECT COUNT(*) as race_count FROM races;"

# Verify KV is empty
wrangler kv key list --namespace-id=YOUR_SESSIONS_NAMESPACE_ID

# Check production database
wrangler d1 execute qr-race-db --remote --command "SELECT COUNT(*) as race_count FROM races;"
```
