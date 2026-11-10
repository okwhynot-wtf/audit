# AUDIT & DUDIT Check-in

A mobile-friendly alcohol and drug screening prototype. Clients choose AUDIT, DUDIT or both, answer one question at a time, then review, download or share a PDF report.

## Features

- Automatic progression after an answer, with Back and answer corrections.
- AUDIT and DUDIT scoring, individual responses and completion time in Australia/Sydney.
- Reversible AUDIT routing: selecting Never in question 1 skips questions 2–8 and records the routing in the report. Changing that response requires those questions again.
- Browser-generated PDF, native file sharing where supported, and download fallback.
- Optional sample session reference and copyable clinical summary.

## Run locally

Use Node.js 22.13 or newer.

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

The tests check score bounds, special item weights, incomplete responses and reversible AUDIT routing. They also generate an example PDF under the ignored `tmp/` directory.

## Deploy to Vercel

Import this repository into Vercel. The included configuration selects Vite, runs `npm run build` and serves `dist`. No environment variables, database or mail account are required for the current PDF-sharing version.

This is a standalone React/TypeScript/Vite app. Its build is independent of the original private preview's hosting system.

## Sharing and data handling

Answers stay in page memory until the client downloads or shares the report. The app does not persist answers in a database or browser storage and does not send responses to its hosting server. Hosting providers may process ordinary request/access metadata.

Share PDF opens the device's sharing menu, where supported. The client chooses an app, enters the recipient and finishes sending. The app cannot confirm email delivery. If file sharing is unavailable, it downloads the PDF for manual attachment. Exported copies may remain on the device and in the chosen app.

Automatic email is not connected. Adding it requires an approved server-side mail service and recipient, with appropriate access controls and delivery/error handling. Never expose mail API keys in browser code.

## Clinical status and instrument sources

Use sample responses while service approval and the clinical workflow are being established. This prototype does not verify patient identity, generate a diagnosis or file a report into an eMR. Confirm the local instrument versions, reproduction permissions, clinician review, privacy and record-filing arrangements before collecting real patient data.

- **AUDIT:** WHO standard 10-item English version, second edition (2001), WHO/MSD/MSB/01.6a, maximum 40. Question 3 retains the standard six-drink wording. Australian standard-drink guidance (10 g alcohol) is supplementary. As a WHO-approved instrument, the AUDIT is in the public domain. [WHO manual](https://www.who.int/publications/i/item/WHO-MSD-MSB-01.6a).
- **DUDIT:** Europe English version 1. Copyright 2002 Anne H. Berman, Hans Bergman, Tom Palmstierna and Frans Schlyter, Karolinska Institutet. All 11 questions are presented. Items 1–9 score 0–4; items 10–11 score 0/2/4; maximum 44. Medicines taken as prescribed are excluded. [Original form and drug list](https://www.euda.europa.eu/system/files/media/attachments/documents/12173/DUDIT-English-version.pdf).

The browser PDF library is bundled locally; its licence is included in `public/vendor/`.
