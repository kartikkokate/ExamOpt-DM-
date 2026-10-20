# Opti: AI assistant and optional pet

## Two ways to use the guide

**Offline guide** works when you open `index.html` directly. It provides built-in, context-aware explanations of your timetable, rooms, conflicts and mathematics. It is not a language model. No connection or key is needed. The optional 3D owl also works locally when WebGL is available.

**AI chat** is a real language-model connection through the Vercel AI SDK and AI Gateway. It requires a local server, an AI Gateway API key, and model access/credits. This is separate from the Runway connection in Codex. Runway's connected creative tools do not supply chat credentials to this project.

## Enable live AI

1. Install Node.js 22 or newer.
2. In this project folder, run `npm ci` once to install the locked dependencies.
3. Copy `.env.example` to `.env` and set `AI_GATEWAY_API_KEY` to your own AI Gateway key. Keep the key only in that local file or the server environment. Do not paste it into the app or send it in chat.
4. Run `npm start`, or double-click `Start-ExamOpt.cmd` on Windows.
5. Open the local address printed by the server, normally `http://127.0.0.1:4173`. Keep the server window open.
6. In **Ask Opti**, select **AI chat**, then type a question or use the microphone. Both input methods use the same conversation and real model connection. **Stop reply** cancels a pending answer. The pet is optional and independent of AI mode.

The configured default model is `anthropic/claude-haiku-5.5`. `AI_MODEL` can select another compatible language model available to your gateway account. A configured key does not prove the account has model access, sufficient credits, or a working connection. Request failures are shown in the app, with offline guidance still available. No real model call was verified while creating this project because no API key was supplied.

Official setup and model information: [AI Gateway authentication](https://vercel.com/docs/ai-gateway/authentication-and-byok/authentication) and [model catalog](https://ai-gateway.vercel.sh/v1/models).

## What is sent

Only AI mode sends requests to the AI service, and only after you ask a question. Requests include the question, up to eight recent chat messages and a summary of the current timetable. The summary includes subject names/codes, aggregate student counts, room capacities/availability, sessions, subject conflicts and assignments. It excludes student roll numbers and individual student enrolments. Invalid-form details are replaced by a generic warning before transmission. Information typed into your question is sent as written, so avoid personal details in messages.

The guide is advisory and cannot edit data, allocate rooms, run commands or execute model-supplied actions. Timetable generation and validation remain deterministic and local. AI suggestions need checking before you apply changes yourself. Chat is held in page memory only; **Clear chat** removes it from this page, without deleting requests already sent to the provider. Reload starts in Offline guide. Provider retention and billing follow your service account settings.

## Typed and voice conversation

Type a question and press **Ask Opti** to use the selected mode. In AI mode, recent conversation history and the current timetable summary accompany follow-up questions. In offline mode, replies are built-in guidance, not a language model.

For voice, use a browser that supports speech recognition, open the app at the local server address, and select **Use microphone**. Allow microphone access in your browser. Speak, then select **Finish speaking** or let the recognition service finish. The transcript appears in the text field so you can correct subject names or exam codes. Press **Ask Opti**, or enable **Send when I finish speaking** for automatic submission after a final transcript. **Cancel listening** discards the current recognition session without sending a question.

Enable **Read replies aloud** for spoken answers; **Stop audio** interrupts playback, and **Replay reply** repeats the most recent response. Select English (India), English (US), or Hindi for recognition and playback language hints. The installed browser/device voices determine pronunciation and language availability. Offline guide text remains English; live AI is instructed to answer in the user's language.

Voice uses the browser Web Speech APIs, not an always-listening or full-duplex realtime audio model. Some browsers do not support recognition, and some send audio to a browser-operated online service. Microphone access, network access and device/browser voice availability affect operation. Voice errors leave typing available. ExamOpt does not upload microphone recordings to its own server: only the recognized text is submitted to the selected chat mode. Speech synthesis uses the browser's speech service and may depend on installed or online voices. No microphone session or speech playback starts automatically when opening the page.

References: [speech recognition and browser limitations](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition), [speech synthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis).

## 3D pet controls

Turn on **Show pet** to reveal Opti, a real 3D owl rendered with Three.js/WebGL. Drag to rotate, scroll/pinch to zoom, or focus the viewer and use left/right arrow keys. **Reset view** restores the camera. **Wave** animates a wing. **Give me a tip** asks a useful question. The owl reacts to the timetable and its beak moves during spoken replies when animation is enabled.

Disable **Animate** to pause idle, wave and speech motion, or hide the pet entirely. Device reduced-motion preferences are respected. Hidden viewers stop their animation loop. Pet preferences are saved locally when browser storage permits. If WebGL is unavailable, an explanation appears and chat continues to work.

**Download 3D model** exports the included `assets/opti.glb`, a self-contained glTF 2 binary model you can import into a 3D editor or viewer. It is a static posed mesh hierarchy; the app's procedural motion is not a skeletal rig or animation clip in the GLB. It was created in project code and does not use a generated image or Runway asset. The viewer is bundled locally, so displaying the model does not contact a CDN. Three.js attribution is included in `assets/THREE-LICENSE.txt`.

To modify/rebuild the pet, run `npm ci`, edit `pet-model.mjs` or `pet3d.mjs`, then run `npm run build`. This regenerates the bundled viewer and GLB. The ready-to-use files are already included in the ZIP.

## Server boundaries and troubleshooting

The server binds only to `127.0.0.1`. It exposes a fixed list of app assets, never `.env`, the server source or installed dependencies. AI requests require the app's local origin and JSON content type. Requests have body/history limits, a timeout and a small in-memory rate limit. This is a single-user development server, not a public deployment with user accounts.

If AI shows **not connected**, use the printed local address rather than opening the HTML file, check the key in `.env`, and restart the server. If the port is busy, change `PORT` in `.env` and use the new printed address. If browser storage is unavailable, draft and pet preferences may not survive a reload; JSON backups remain available.

Run `npm test` to verify the scheduler, interface behaviors, offline guide, voice state machine, voice-to-chat-to-speech flow, 3D model integrity and local API boundary with a mocked model. These checks do not spend model credits or establish live AI access, microphone hardware, spoken playback quality or rendered 3D appearance. Actual model responses, microphone capture and visual rendering remain unverified in this environment.
