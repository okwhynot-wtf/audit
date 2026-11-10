import { Answers, FORMS, Selection, formIds, reportSummary } from "./instruments";
type Font = { widthOfTextAtSize: (text: string, size: number) => number };
type Page = { drawText: (text: string, options: Record<string, unknown>) => void; drawRectangle: (options: Record<string, unknown>) => void };
type Doc = { embedFont: (name: string) => Promise<Font>; addPage: (size: number[]) => Page; getPages: () => Page[]; save: () => Promise<Uint8Array>; setTitle: (value: string) => void; setAuthor: (value: string) => void; setCreationDate: (value: Date) => void };
export type PdfLibrary = { PDFDocument: { create: () => Promise<Doc> }; StandardFonts: { Helvetica: string; HelveticaBold: string }; rgb: (r: number, g: number, b: number) => unknown };
export type ReportInput = { selection: Selection; answers: Answers; reference: string; date: string };
let pdfLoader: Promise<PdfLibrary> | undefined;
export function loadPdf(): Promise<PdfLibrary> {
  if (!pdfLoader) {
    pdfLoader = import("pdf-lib").then(module => module as unknown as PdfLibrary).catch(() => {
      pdfLoader = undefined;
      throw new Error("The PDF tool could not load. Check your connection and try again.");
    });
  }
  return pdfLoader;
}

const ascii = (s: string) => s.replace(/[–—]/g, "-").replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\x7E\n]/g, "?");
export async function createReport(input: ReportInput, lib: PdfLibrary): Promise<Uint8Array> {
  const doc = await lib.PDFDocument.create();
  const font = await doc.embedFont(lib.StandardFonts.Helvetica);
  const bold = await doc.embedFont(lib.StandardFonts.HelveticaBold);
  const ink = lib.rgb(.12, .19, .18), muted = lib.rgb(.38, .43, .42), teal = lib.rgb(.06, .38, .34);
  const width = 595.28, height = 841.89, left = 45, usable = width - 90;
  let page: Page, y = 0;
  const newPage = () => {
    page = doc.addPage([width, height]);
    page.drawText("CHECK-IN / AOD SCREENING", { x: left, y: height - 40, size: 9, font: bold, color: teal });
    page.drawText("PROTOTYPE - SAMPLE USE ONLY", { x: left, y: height - 55, size: 8, font, color: muted });
    y = height - 87;
  };
  const lines = (text: string, size: number, f: Font) => {
    const result: string[] = [];
    for (const paragraph of ascii(text).split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        const proposal = line ? `${line} ${word}` : word;
        if (f.widthOfTextAtSize(proposal, size) > usable && line) { result.push(line); line = word; } else line = proposal;
        while (f.widthOfTextAtSize(line, size) > usable) {
          let split = line.length - 1;
          while (split > 1 && f.widthOfTextAtSize(line.slice(0, split), size) > usable) split--;
          result.push(line.slice(0, split)); line = line.slice(split);
        }
      }
      result.push(line);
    }
    return result;
  };
  const write = (text: string, size = 10, f = font, color = ink, gap = 7) => {
    for (const line of lines(text, size, f)) {
      if (y < 62) newPage();
      page.drawText(line, { x: left, y, size, font: f, color }); y -= size * 1.45;
    }
    y -= gap;
  };
  newPage();
  write("Alcohol & drug check-in", 23, bold, ink, 12);
  write(`Completed: ${new Date(input.date).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })} (Australia/Sydney)`, 10, font, muted, 3);
  write(`Session reference: ${input.reference || "Not supplied - identity must be verified by the clinician"}`, 10, font, ink, 13);
  write("Self-reported responses. Not a diagnosis. Clinician review and patient identity have not been verified. No automatic email has been sent.", 10, font, muted, 16);
  for (const id of formIds(input.selection)) {
    const form = FORMS[id];
    if (y < 160) newPage();
    const completed = form.questions.every(q => input.answers[q.id]);
    const score = completed ? form.questions.reduce((sum, q) => sum + input.answers[q.id].score, 0) : null;
    write(`${form.name} - ${score === null ? "INCOMPLETE" : `${score} / ${form.max}`}`, 16, bold, teal, 4);
    write(form.full, 10, font, muted, 12);
    for (const q of form.questions) {
      const answer = input.answers[q.id];
      const answerText = !answer ? "NOT ANSWERED - no score assigned" : answer.skipped ? `${answer.label}; score 0.` : `${answer.label}  [score ${answer.score}]`;
      const needed = (lines(`${q.number}. ${q.text}`, 10, bold).length + lines(answerText, 10, font).length) * 14.5 + 16;
      if (y - needed < 62) newPage();
      write(`${q.number}. ${q.text}`, 10, bold, ink, 3);
      write(answerText, 10, font, answer?.skipped ? muted : teal, 8);
    }
    y -= 5;
  }
  if (y < 170) newPage();
  write("Clinical summary", 12, bold, teal, 7);
  write(reportSummary(input.selection, input.answers, input.reference, input.date), 9, font, ink, 10);
  write("Instrument sources", 10, bold, ink, 5);
  if (formIds(input.selection).includes("audit")) write("AUDIT: WHO (2001), second edition, WHO/MSD/MSB/01.6a. Standard 10-item English version; public domain. Australian standard drink = 10 g alcohol.", 8, font, muted, 5);
  if (formIds(input.selection).includes("dudit")) write("DUDIT: Europe English v1. Copyright 2002 Anne H. Berman, Hans Bergman, Tom Palmstierna & Frans Schlyter, Karolinska Institutet. Medicines taken as prescribed are excluded.", 8, font, muted, 5);
  write("Prototype only. Clinical use, instrument permissions and data handling require local confirmation before patient use.", 8, font, muted, 0);
  doc.getPages().forEach((p, i, pages) => {
    p.drawRectangle({ x: left, y: 39, width: usable, height: .5, color: lib.rgb(.85, .89, .87) });
    p.drawText(`CHECK-IN / SAMPLE REPORT                                      Page ${i + 1} of ${pages.length}`, { x: left, y: 25, size: 8, font, color: muted });
  });
  doc.setTitle("AOD Check-in - AUDIT and DUDIT screening report");
  doc.setAuthor("Check-in prototype");
  doc.setCreationDate(new Date(input.date));
  return doc.save();
}
