import { css, Style } from 'hono/css'

const globalCSS = css`
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:opsz,wght@14..32,100..900&display=swap');

  :root {
    --primary: #3b82f6;
    --primary-foreground: #ffffff;
    --background: #ffffff;
    --foreground: #0f172a;
    --muted-foreground: #64748b;
    --border: #e2e8f0;
    --destructive: #ef4444;
  }

  /* @media (prefers-color-scheme: dark) {
    :root {
      --background: #0f172a;
      --foreground: #f8fafc;
      --border: #334155;
      --muted-foreground: #94a3b8;
    }
  } */

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: 'Inter', system-ui, sans-serif;
  }

  body {
    line-height: 1.5;
    color: var(--foreground);
    background-color: var(--background);
    padding: 1rem;
    max-width: 480px;
    margin: 0 auto;
  }

  h1 {
    font-family: 'Instrument Serif', serif;
    font-size: 4rem;
    font-weight: 400;
    margin: 1.5rem 0;
    line-height: 1.05;
  }

  h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  p {
    color: var(--muted-foreground);
    margin-bottom: 1.5rem;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 2rem;
  }

  input {
    height: 3rem;
    padding: 0 1.25rem;
    border: 1px solid var(--border);
    border-radius: 9999px; /* fully rounded */
    font-size: 1rem;
    background-color: var(--background);
    color: var(--foreground);
    width: 100%; /* full width */
  }

  input:focus {
    outline: 2px solid var(--primary);
    outline-offset: -1px;
  }

  button {
    margin-top: 1rem;
    height: 3rem;
    padding: 0 1.5rem;
    background-color: var(--primary);
    color: var(--primary-foreground);
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
  }

  button:hover,
  a[href$='Start New Race']:hover {
    opacity: 0.9;
  }

  ol {
    list-style: none;
    counter-reset: leaderboard;
  }

  ol li {
    counter-increment: leaderboard;
    padding: 1rem;
    margin-bottom: 0.5rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    position: relative;
    padding-left: 3rem;
  }

  ol li::before {
    content: counter(leaderboard);
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1.5rem;
    height: 1.5rem;
    background-color: var(--primary);
    color: var(--primary-foreground);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    font-weight: 600;
  }

  /* Error messages */
  p:contains('not found'),
  p:contains('Invalid'),
  p:contains('must complete'),
  p:contains('already completed'),
  p:contains('Session not found') {
    background-color: color-mix(in srgb, var(--destructive) 10%, transparent);
    color: var(--destructive);
    border: 1px solid color-mix(in srgb, var(--destructive) 20%, transparent);
    border-radius: 0.5rem;
    padding: 1rem;
  }

  .clue-tag {
    display: inline-block;
    background: var(--primary);
    color: var(--primary-foreground);
    border-radius: 9999px;
    padding: 0.35em 1em;
    font-size: 0.9rem;
    font-weight: 500;
    margin-bottom: 0.75rem;
  }

  .clue-completed-message {
    color: var(--muted-foreground);
    font-size: 1rem;
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 1rem 0;
    text-align: center;
  }

  .leaderboard-highlight {
    background: color-mix(in srgb, var(--primary) 12%, transparent);
    border-color: var(--primary);
    font-weight: 600;
  }

  .leaderboard-inprogress {
    opacity: 0.6;
    font-style: italic;
    background: none;
    border: 1px dashed var(--border);
  }
  .leaderboard-inprogress::before {
    font-style: normal;
  }

  @media (max-width: 375px) {
    body {
      padding: 0.5rem;
    }

    h1 {
      font-size: 1.5rem;
    }

    input,
    button {
      height: 2.75rem;
    }
  }

  /* QR Code Printing Styles */
  @media print {
    .page-break { 
      page-break-before: always; 
    }
    body {
      max-width: none;
      margin: 0;
      padding: 0;
    }
    h1 {
      font-size: 3rem;
    }
  }

  .qr-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 40px;
    text-align: center;
  }

  .qr-code {
    margin: 20px 0;
    /* margin-bottom: 40px; */
  }

  .print-text {
    margin-top: 50px;
  }

  .landing-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px;
  }

  .landing-qr {
    margin-bottom: 30px;
  }

  .landing-content {
    text-align: center;
    max-width: 600px;
  }

  .print-title {
    font-size: 5rem;
  }
`


export const GlobalStyles = () => <Style>{globalCSS}</Style>
