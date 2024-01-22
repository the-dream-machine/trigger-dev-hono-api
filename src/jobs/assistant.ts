import { z } from "zod"
import { OpenAI } from "@trigger.dev/openai"
import { eventTrigger, type TriggerClient } from "@trigger.dev/sdk"
import { type AppBindings } from "../types/AppBindings"
import { whatsappSendMessage } from "../utils/whatsappSendMessage"

interface Args {
  client: TriggerClient
  env: AppBindings
}

interface Chat {
  threadId: string
}

export const assistantJob = ({ client, env }: Args) => {
  // Initialize OpenAI client
  const openai = new OpenAI({
    id: "openai",
    apiKey: env.OPENAI_API_KEY,
  })

  // Define the background job
  const job = client.defineJob({
    id: "assistant_generate_response",
    name: "Assistant generate response",
    version: "1.0.0",
    trigger: eventTrigger({
      // The identifier used to trigger this job from the API
      name: "assistant.response",

      // Define the schema of the payload
      schema: z.object({
        chatId: z.string(),
        message: z.string(),
      }),
    }),

    // Add the OpenAI integration to this job
    integrations: { openai },
    run: async (payload, io, ctx) => {
      const { chatId, message } = payload

      // Check if chat exists in key-value store
      const chatExists = await io.store.job.has("chat-exists", chatId)

      let threadId = ""
      if (chatExists) {
        // Get the OpenAI thread ID associated with the WhatsApp chat ID
        const chat = await io.store.job.get<Chat>("get-chat", chatId)
        if (!chat) {
          throw new Error(`No chat found with ID ${chatId}`)
        }

        threadId = chat.threadId
      } else {
        // Create a new thread
        const thread = await io.openai.beta.threads.create("create-thread")

        // Register the new chat session
        await io.store.job.set("chat-set", chatId, { threadId: thread.id })

        threadId = thread.id
      }

      // Add the message to the conversation thread
      await io.openai.beta.threads.messages.create("create-message", threadId, {
        role: "user",
        content: message,
      })

      // Invoke the assistant to generate a response and wait for it to complete
      const run = await io.openai.beta.threads.runs.createAndWaitForCompletion(
        "create-run",
        threadId,
        { assistant_id: env.OPENAI_ASSISTANT_ID }
      )

      // Make sure the assistant has finished generating the response
      if (run?.status !== "completed") {
        throw new Error(
          `Run finished with status ${run?.status}: ${JSON.stringify(
            run?.last_error
          )}`
        )
      }

      // List the most recent message in the thread
      const messages = await io.openai.beta.threads.messages.list(
        "list-messages",
        run.thread_id,
        { query: { limit: "1" } }
      )

      // Retrieve the latest assistant message
      const content = messages[0].content[0]

      // Verify the message contains text and not an image
      if (content.type === "image_file") {
        throw new Error(
          "The OpenAI response was an image but we expected text."
        )
      }

      // Send the assistant's response to the WhatsApp API so it can be forwarded to the user
      const responseMessage = content.text.value
      await whatsappSendMessage({
        whatsappApiUrl: env.WHATSAPP_API_URL,
        chatId,
        message: responseMessage,
      })

      return { message: responseMessage }
    },
  })

  return job
}
