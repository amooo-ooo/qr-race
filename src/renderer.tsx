import { jsxRenderer } from 'hono/jsx-renderer'
import { ViteClient } from 'vite-ssr-components/hono'
import { GlobalStyles } from './styles'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <ViteClient />
        <GlobalStyles />
      </head>
      <body>{children}</body>
    </html>
  )
})