import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();
const app = express();
const port = 4500;
const allowedOrigins = ['https://frontend-api-zeta.vercel.app/'];

app.use(cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed'));
      }
    }
}));
app.use(bodyParser.json());

const GEMINI_API_KEY = process.env.GOOGLE_GENAI_API_KEY;

async function getAIResponse(userInput, options = {}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  let structuredPrompt = '';
  
  if (options.summarize && options.translate) {
    structuredPrompt = `
FORMAT YOUR RESPONSE IN MARKDOWN.
Be concise and focused. Don't add unnecessary information.

First summarize the text, then translate the summary to ${options.language}.
Format your response with clear headings:

## Summary
[Your concise summary here]

## Translation (${options.language})
[Your translation here]

ORIGINAL TEXT:
${userInput}
`;
  } else if (options.summarize) {
    structuredPrompt = `
FORMAT YOUR RESPONSE IN MARKDOWN.
Be concise and focused. Don't add unnecessary information.

## Summary
[Provide a clear, concise summary of the text below]

ORIGINAL TEXT:
${userInput}
`;
  } else if (options.translate) {
    structuredPrompt = `
FORMAT YOUR RESPONSE IN MARKDOWN.
Be concise and focused. Don't add unnecessary information.

## Translation (${options.language})
[Translate the text below to ${options.language}]

ORIGINAL TEXT:
${userInput}
`;
  } else {
    structuredPrompt = userInput;
  }

  const payload = {
    contents: [
      {
        parts: [
          { text: structuredPrompt }
        ]
      }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });   

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI";
  return text;
}

app.post('/ask-ai', async (req, res) => {
  const { text, summarize, translate, language } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Missing text input' });
  }

  try {
    const aiReply = await getAIResponse(text, { 
      summarize, 
      translate, 
      language 
    });
    res.json({ original: text, response: aiReply });
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: "Failed to get AI response" });
  }
});

app.listen(port, () => {
  console.log(`AI Simulator running at http://localhost:${port}`);
});
