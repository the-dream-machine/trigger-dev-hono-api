interface Args {
  whatsappApiUrl: string
  chatId: string
  message: string
}

export const whatsappSendMessage = async ({
  whatsappApiUrl,
  chatId,
  message,
}: Args) => {
  const body = { chatId, message }
  const options = {
    body: JSON.stringify(body),
    method: "POST",
    headers: {
      "content-type": "application/json;charset=UTF-8",
    },
  }

  const response = await fetch(`${whatsappApiUrl}/send-message`, options)
  return JSON.stringify(await response.json())
}
