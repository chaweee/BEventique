# Socket Development Notes

## Normal Development Disconnects
During React development (especially with `React.StrictMode` and fast refresh), the browser will:
- Tear down the component tree on save
- Unmount sockets and reconnect
- Trigger a brief disconnect (`transport close` or `ping timeout` sometimes) followed by a new connection ID

This is expected and not a production issue.

## What We Added
- Reconnection attempts (max 10) with an increasing delay
- Automatic rejoin of the active thread room after reconnect
- Event handlers for `connect_error`, `reconnect_attempt`, `reconnect_failed`, and `disconnect`

## When to Worry
Investigate further if you see:
- Continuous `connect_error` messages (every few seconds) without successful reconnect
- `reconnect_failed` firing (means all attempts exhausted)
- CORS errors in the console for `http://localhost:3001/socket.io/`

## Quick Health Check
Use the health endpoint to confirm backend availability:
```
Invoke-RestMethod http://localhost:3001/api/health
```
You should see `{ db: "up" }`.

## Collecting Errors
Open DevTools Console and Network (WS filter):
1. Note any repeated errors.
2. Copy the first full error line (stack or message).
3. Share it if persistent.

Global listeners were added in `my-app/src/index.js` to log uncaught errors and unhandled promise rejections.

## Production Tip
In production you typically build with `npm run build` for the frontend. That removes fast refresh churn and sockets should remain stable unless the server restarts.

---
_Last updated: 