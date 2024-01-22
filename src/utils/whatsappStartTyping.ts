interface Args {
  whatsappApiUrl: string
  chatId: string
}

export const whatsappStartTyping = async ({ whatsappApiUrl, chatId }: Args) => {
  const body = { chatId }
  const options = {
    body: JSON.stringify(body),
    method: "POST",
    headers: {
      "content-type": "application/json;charset=UTF-8",
    },
  }

  const response = await fetch(`${whatsappApiUrl}/start-typing`, options)
  return JSON.stringify(await response.json())
}
