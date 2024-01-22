import { Hono } from "hono"
import { AppBindings } from "./types/AppBindings"
import { addMiddleware } from "@trigger.dev/hono"
import { triggerClient } from "./utils/triggerClient"

const app = new Hono<{ Bindings: AppBindings }>()
addMiddleware(app, (env) => triggerClient(env))

app.get("/", (c) => {
  return c.text(`Assistant ID: ${c.env.OPENAI_ASSISTANT_ID}`)
})

// Handle incoming WhatsApp messages
app.post("/wa-message-received", async (c) => {
  const { message } = await c.req.json()

  // Trigger the job with the message payload
  const event = await triggerClient(c.env).sendEvent({
    name: "assistant.response",
    payload: { chatId: message.from, message: message.body },
  })

  return c.json({ event })
})

export default app
