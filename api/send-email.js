export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { destinatario, assunto, corpo } = req.body;

  if (!destinatario || !assunto || !corpo) {
    return res.status(400).json({ error: "Campos obrigatórios: destinatario, assunto, corpo" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "mcp-client-2025-04-04"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        mcp_servers: [
          {
            type: "url",
            url: "https://gmail.mcp.claude.com/mcp",
            name: "gmail"
          }
        ],
        messages: [
          {
            role: "user",
            content: `Send an email using the Gmail tool with these details:
To: ${destinatario}
Subject: ${assunto}
Body:
${corpo}

Use the send_email tool to send it now.`
          }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic error:", err);
      return res.status(502).json({ error: "Erro ao chamar Anthropic API", detail: err });
    }

    const data = await response.json();

    // Extract result text
    const texts = data.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join(" ");

    const toolResults = data.content.filter(b => b.type === "mcp_tool_result");

    return res.status(200).json({
      ok: true,
      msg: texts || "E-mail enviado.",
      toolResults: toolResults.length
    });

  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: err.message });
  }
}
