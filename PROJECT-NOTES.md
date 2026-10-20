# ExamOpt — Smart Exam Timetable Generator

## Problem statement

Institutions must schedule examinations for students enrolled in overlapping subject combinations. Manual schedules can create simultaneous exams for the same student or assign rooms without enough seats. This project models the problem using discrete mathematics and generates an inspectable timetable subject to explicitly provided slots and room constraints.

## Objectives

1. Represent students, subjects, enrolments, rooms, and slots using finite sets and relations.
2. Construct and visualize the subject conflict graph.
3. Compare degree-ordered greedy coloring and DSATUR under the same constraints.
4. Assign rooms using bipartite matching while respecting capacity and availability.
5. Independently verify assignments and report incomplete schedules clearly.

## Mathematical model

Let S be the set of students, C subjects, R rooms, and T slots. Enrolment E is a subset of S × C. For each subject c, N(c) = {s in S : (s,c) in E}.

The conflict graph is G = (C,F), where {a,b} is in F exactly when a ≠ b and N(a) ∩ N(b) is nonempty. F is an undirected edge set; the corresponding binary conflict relation is symmetric and irreflexive. It is generally not transitive.

The timetable function f maps scheduled subjects to T. For every conflict edge {a,b} whose endpoints are scheduled, f(a) ≠ f(b). Thus f is a proper coloring on the scheduled subgraph. Room assignment h maps scheduled subjects to R. Capacity requires |N(c)| ≤ capacity(h(c)). Subjects in the same slot must occupy distinct rooms, and both subject and room must be available.

For a given slot, let X be its proposed exams. Build H = (X ∪ R, A), where (c,r) is an edge if r is available and capacity(r) ≥ |N(c)|. A matching covering X assigns a distinct eligible room to every exam. Hall's theorem states that such a matching exists exactly when every subset U of X has at least |U| neighboring rooms. The implementation finds augmenting paths rather than enumerating those subsets.

## Correctness argument

Initially the assignment is empty and has no conflicts. When inserting an exam into a slot, the algorithm checks that no exam already in that slot is adjacent to it. Existing slot assignments remain unchanged, so the no-conflict invariant is preserved by induction. The room matcher returns a one-to-one assignment to eligible rooms for the entire updated slot; other slots retain their valid assignments. Therefore all placed exams obey the modeled student, room, capacity and availability constraints. This establishes validity of assignments, not optimality or completeness.

## Counting and complexity

With n subjects and k labeled slots, k^n is the number of unrestricted slot assignments. Conflicts and room constraints remove many assignments. The app does not enumerate them. Even a conflict-free assignment may fail room feasibility.

Building edges costs O(sum over students of d_s²), where d_s is a student's number of subjects. A single room matching with q exams, r rooms and a eligibility edges takes O(qr + qa) with the straightforward augmenting-path implementation (ignoring sorting factors). The current scheduler rebuilds matching for candidate slots and rescans vertices for DSATUR selection. It favors clarity and small classroom datasets over large-scale performance. Memory includes the enrolments, adjacency sets and room eligibility graph. Minimum graph coloring is NP-hard; these polynomial heuristics trade guaranteed optimality for speed.

## Demonstration plan

1. Load the sample and explain a conflict edge using a student's shared subjects.
2. Generate with DSATUR and show that same-color vertices have no connecting edge.
3. Compare with greedy; equal results are valid and neither must always outperform the other.
4. Reduce the slots to two and show unplaced exams rather than hidden clashes.
5. Restore the demo, reduce room capacities to one, and explain why exams cannot be placed.
6. Restore the demo and export the CSV.

The interface guides users through entering details, creating a timetable, and reviewing the result. Subjects, exam sessions, rooms and students each have their own expandable section; individual entries expand for editing. Student enrolments and unavailable sessions use named checkboxes. The timetable appears first, while the graph and algorithm comparison are under “How does it work?” and method selection is under “Advanced settings”.

The main timetable groups exams into session cards with room and seat counts; a table view is also available. Student and subject-search filters apply to both the visible result and CSV export. Automatic mode compares DSATUR and greedy, prioritizing more placed exams and then fewer occupied sessions, with DSATUR breaking ties. This selection improves on committing to one heuristic for every dataset, but is not an optimality guarantee. Browser-local drafts preserve work between reloads when storage is available, and a JSON backup supports transfer between devices.

Opti adds two distinct guidance modes. The offline guide is deterministic, using the current validated result to explain conflicts, room restrictions and next steps. Optional live AI chat uses a language model through a local server, receiving messages and a summary without roll numbers or individual enrolments. Typed questions and browser speech-recognition transcripts use the same conversation. Replies can be read aloud using browser speech synthesis. The pet is a separate, optional real 3D owl, rendered locally with Three.js and available as a GLB download, with visibility, rotation, zoom and motion controls. Speech and 3D are presentation features; scheduling remains based on graph algorithms and matching.

The guide can explain and suggest changes, but cannot edit inputs or replace the deterministic schedule verifier. Demonstrate guide mode without a key; demonstrate AI mode only after configuring and verifying actual model access. Do not claim the deterministic guide is itself generative AI, that push-to-talk is a full-duplex realtime audio model, or that a simulated test establishes actual microphone/model operation.

It also supports reference-preserving subject and slot renames, student-specific timetable views, filtered CSV exports, and per-slot explanations of unplaced exams. Demonstrate these by selecting student S01, changing a room capacity through the form, and reviewing the resulting explanation. Deleting a referenced subject or slot leaves an explicit validation error until its references are corrected. Missing selections can be unticked directly in the forms.

## Evaluation and reporting

Record dataset size, edges, algorithm, placed exams, occupied slots, seat utilization and runtime. Use several datasets with sparse and dense conflicts and different room restrictions. Compare slot counts only alongside completeness; an incomplete schedule using fewer slots is not automatically better. For timing claims, run repeated trials under the same conditions and report the distribution. Do not invent experimental results or claim minimum slots without an exact baseline or proof.

The supplied tests include known small cases and generated cases; see README for the command. Add your college's title page, team names, course details, actual screenshots, measured results and required bibliography before submission. This document is a project foundation, not a claim that those institution-specific sections are complete.

## SDG alignment

The primary intended alignment is SDG 4 (Quality Education): supporting reliable academic administration. Efficient resource allocation may support SDGs 9 and 12. Any claims about reduced electricity, fairness, accessibility or inequality need additional features and measured evidence; the current implementation does not establish those impacts.

## Viva prompts

- **Why an undirected graph?** Sharing a student creates a symmetric conflict between two subjects.
- **What does a color mean?** One provided non-overlapping exam slot.
- **Degree versus saturation?** Degree counts neighboring subjects; saturation counts the distinct slots currently assigned to neighbors.
- **Why use matching?** Independent room choices can double-book a room; a matching assigns distinct eligible rooms and can revise earlier choices within the slot.
- **Does DSATUR always win?** No. Both are heuristics and results depend on the graph, constraints and tie-breaking.
- **What does unscheduled mean?** This attempt could not place the exam; another ordering, algorithm or backtracking search might succeed.
- **What would improve the project?** Backtracking or an exact solver for small cases, student break constraints, invigilator matching, CSV enrolment import, scalable graph layouts and accessibility accommodations.
