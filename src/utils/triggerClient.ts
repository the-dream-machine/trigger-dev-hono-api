import { TriggerClient } from "@trigger.dev/sdk"
import { AppBindings } from "../types/AppBindings"
import { assistantJob } from "../jobs/assistant"

export const triggerClient = (env: AppBindings) => {
  const client = new TriggerClient({
    id: "whatsapp-assistant",
    apiKey: env.TRIGGER_API_KEY,
    apiUrl: env.TRIGGER_API_URL,
  })

  assistantJob({ client, env })

  return client
}
