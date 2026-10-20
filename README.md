# ExamOpt — Smart Exam Timetable Generator

A Discrete Mathematics course project that builds a subject conflict graph, schedules exams using two coloring heuristics, and allocates rooms using bipartite matching. The planner, offline guide and optional 3D owl run locally without an account. Live AI chat uses typing or browser voice input and requires a configured local server.

## Run

Open `index.html` in Chrome, Edge, or Firefox. Demo data loads automatically. No server or internet connection is required.

1. Use the loaded example, or open a section under **Enter exam details** to edit it. Expand an individual entry to change its fields. Add subjects, exam sessions, rooms and then students.
2. Tick the subjects each student takes. Optional unavailable sessions also use checkboxes, with session names instead of codes.
3. Select **Create timetable**. Exams are grouped by session, with their assigned room, student count and seat capacity. Switch to **Table** for a compact list.
4. Choose a student under **Show exams for**, or keep **Everyone** selected. Search by subject name or code. **Download timetable** exports only the exams matching both filters; **Print timetable** prints that view. Summary cards and diagnostics describe the whole schedule.
5. Expand **How does it work?** to see the graph and compare algorithms. **Automatic** is the default: it picks the method that schedules more exams, then uses fewer sessions. An exact tie uses DSATUR. You can select either method manually under **Advanced settings**.
6. For partial schedules, expand **Why some exams could not be placed** for per-exam, per-slot explanations and suggested changes.
7. Use **Ask Opti** for explanations and next steps. Turn on **Show pet** for the 3D owl: rotate, zoom, wave or download its GLB model. Disable **Animate** to pause it. For real language-model chat through typing and microphone input, see [AI-SETUP.md](AI-SETUP.md). Voice supports transcript review, optional automatic sending, spoken replies, replay, cancel and stop controls; browser support varies.

Use the forms to add, remove, or change records. Short subject and session codes identify records internally; examples appear beside the fields. Renaming a code updates its references automatically. Removing a referenced record requires you to correct its references; validation explains what needs attention. Missing references appear as checked options that can be unticked. Enrolments and unavailable sessions use named checkboxes.

JSON editing remains available under **Advanced settings → Edit the data as JSON**. Editing clears previous results and shows a prompt to create a new timetable. Input data is treated as text and processed only in the browser.

## Saving and recovery

ExamOpt saves a single local draft using browser storage, including incomplete form entries and JSON edits, and restores it on reload. Text being typed is also saved before the field loses focus. The selected layout and scheduling method are preserved; student and search filters reset on reload. **Reset to example** replaces the current draft with the example. There is no multi-version draft history or shared multi-tab editing support.

Pet visibility and animation preferences use a separate local setting. Chat messages stay in page memory and are cleared on reload. The guide starts in offline mode each time; no AI requests are sent just by opening the app.

Storage may be disabled or restricted, particularly for local files and private windows. The draft indicator reports when saving is unavailable; the app still works. **Download a backup** exports a separate JSON copy of valid data; **Open saved data** imports it. An invalid or incomplete draft can stay in local storage, but must be corrected before downloading a validated JSON backup. For malformed JSON, recovery opens the advanced JSON editor. Local drafts stay on this browser profile and may be removed if browser storage is cleared. Existing JSON files remain compatible.

## Input rules

- `subjects`: objects with unique string `id`, `name`, optional `unavailable` slot ID array.
- `students`: objects with unique string `id`, nonempty `subjects` array of unique subject IDs.
- `rooms`: objects with unique string `id`, positive integer `capacity`, optional `unavailable` slot ID array.
- `slots`: objects with unique string `id`, `label`, ordered chronologically by the user.
- All four arrays must be nonempty. Every subject needs an enrolment.

Each slot must be a non-overlapping session long enough for every exam assigned to it. The app treats labels as text and does not infer dates, durations, or overlaps. Each exam occupies one room, without splitting students across rooms. Demo room capacities of 4–6 seats intentionally match the small example cohort.

## Algorithms

The graph has one vertex per subject and one undirected edge for each pair with a common student. Repeated common enrolments increase an edge's student count, not its degree.

**Greedy:** select the unprocessed vertex with greatest degree; break ties by subject ID. **DSATUR:** select greatest saturation (number of distinct slots used by scheduled neighbors), then greatest degree, then subject ID. Both try slots in input order and accept the first slot with no neighbor conflict, no subject unavailability and a full room matching. This adapts coloring to room and availability constraints.

For each trial slot, construct a bipartite graph of exams and eligible rooms. Eligibility requires availability and sufficient seats. A depth-first augmenting-path algorithm finds a full matching or rejects the trial. Previously assigned rooms in that slot can be reassigned by the matching. A failed exam remains explicitly unscheduled; the algorithms do not backtrack over earlier slot choices.

The independent verifier checks duplicate exams, student clashes, room double-booking, capacity and availability. Completeness is reported separately as scheduled/total and the unscheduled list. A valid partial schedule is not called complete. Automatic selection compares these two verified heuristic results; it is not an exact optimizer and does not search all possible timetables.

## Metrics

- **Sessions used:** distinct occupied slots.
- **Student clashes:** violations in simultaneous student assignments; every produced result is independently checked before display.
- **Seats filled:** total enrolled exam seats / sum of capacities of the assigned exam-room pairs. This measures seats in booked rooms, not all available room-hours.
- **Runtime:** one algorithm call including validation and graph construction up to assignment and metric calculation; excludes verification and rendering. Single runs fluctuate and are not a benchmark.

Neither heuristic guarantees a minimum-slot solution. A failure to place all exams does not prove infeasibility. The app does not optimize student breaks, daily exam limits, invigilators, accommodations, travel, or differing durations. Large graphs can become crowded in the circular view; the table remains readable.

## Project files

`index.html`, `styles.css`, `app.js`: interface and local draft recovery. `engine.js`: validation, graph construction, algorithms and verifier. `sample.json`: importable demo. `sample-data.js`: same demo embedded for offline browser loading. `tests/engine.test.js`: algorithm checks. `tests/app.test.js` and `tests/usability.test.js`: interface behavior and draft checks. `PROJECT-NOTES.md`: report and viva material.

`assistant-core.js`: deterministic local guidance and roster-free AI context. `companion.js`: chat and pet interface. `voice.js`, `voice-ui.js`: speech input/playback and controls. `pet-model.mjs`, `pet3d.mjs`: 3D geometry and viewer source; `pet3d.bundle.js`, `assets/opti.glb`: bundled local viewer and downloadable model. `server.mjs`: optional local AI endpoint. `AI-SETUP.md`, `.env.example`, `package.json`, `package-lock.json`, and `Start-ExamOpt.cmd`: live AI setup. The ZIP excludes `.env` and installed dependencies. Run `npm ci` to install the locked server dependencies if using AI chat. Run `npm run build` only when changing 3D source files.

## Validation

With Node.js installed, run `node tests/engine.test.js`, `node tests/app.test.js`, and `node tests/usability.test.js` from this folder. Engine tests cover a triangle with known chromatic number, limited slots, insufficient seats, unavailability, room reassignment, invalid references, duplicate IDs, deliberate clashes, explanations for all four blocker types, and 120 generated schedules checked independently against the original enrolments.

Interface checks cover forms, reference-preserving renames, student filtering, search and CSV consistency, session/table layouts, draft recovery (including invalid and incomplete data), and storage failures. A crown-graph case verifies that automatic selection chooses the complete DSATUR result when greedy leaves exams unscheduled. These checks use a lightweight DOM substitute; they do not verify visual layout or browser event timing. Automated visual review was unavailable because the preview tool blocked local-file access.

With dependencies installed, `npm test` runs all checks, including guidance, privacy summaries, safe chat text, voice transcription state, voice-to-chat-to-speech with a simulated model, cancellation, unsupported browsers and GLB model integrity. Local HTTP tests verify model integration with a mock, request/origin limits, static-file restrictions, and failure messages. They do not send live AI requests or spend model credits. A real AI response remains unverified until a valid gateway key is configured. Hardware microphone/speaker behavior and visual 3D rendering are also unverified. The pet is a procedural Three.js model, with no external media-generation dependency.
