## Remotion + Railway Starter

<img width="200" height="200" alt="image" src="https://github.com/user-attachments/assets/1838b517-8563-4398-b537-005e26052d38" />


Minimal starter to render Remotion videos via an Express server and deploy on Railway.

### Deploy with Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/remotion?referralCode=CREDITS&utm_medium=integration&utm_source=template&utm_campaign=generic)

### Quickstart (local)
- Install: `npm install`
- Dev server: `npm run dev`
- Remotion Studio: `npm run remotion:studio`
- Production: `npm start`

### API
- **POST `/renders`**: Start a render. Body: `{ quizData: { questions: [{ question, options, correctAnswerIndex }] }, chatId?: string }`
- **GET `/renders/:id`**: Status of a render
- **DELETE `/renders/:id`**: Cancel a render

Example:
```bash
curl -X POST https://<your-app>.railway.app/renders \
  -H 'Content-Type: application/json' \
  -d '{
    "quizData": {
      "questions": [
        {"question":"Sample question?","options":["A","B","C","D"],"correctAnswerIndex":0}
      ]
    }
  }'
```

### Deploy to Railway
1) Create a new project on Railway and connect this repository
2) Default start command uses `PORT` env, no extra config needed
3) Optional envs:
   - **REMOTION_SERVE_URL**: Use a pre-bundled Remotion serve URL
   - **TELEGRAM_BOT_TOKEN**: If set and you send a `chatId`, the server will attempt to send the finished video via Telegram

### Notes
- Default composition is `QuizVideo` (vertical 1080x1920). It shows a simple intro and placeholder questions.
- Assets live in `public/` and are referenced using `staticFile(...)`.
- To customize the video, edit files under `remotion/` (for example `remotion/QuizVideo.tsx`).

### Useful
- Render locally: `npx remotion render`
- Upgrade Remotion: `npx remotion upgrade`

Docs: [Remotion Fundamentals](https://www.remotion.dev/docs/the-fundamentals)
