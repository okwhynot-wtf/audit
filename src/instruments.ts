export type FormId = "audit" | "dudit";
export type Selection = FormId | "both";
export type Option = { label: string; score: number };
export type Question = { id: string; form: FormId; number: number; text: string; options: Option[] };
export type Answer = { score: number; label: string; skipped?: boolean };
export type Answers = Record<string, Answer>;
const options = (labels: string[], scores = [0, 1, 2, 3, 4]): Option[] => labels.map((label, i) => ({ label, score: scores[i] }));
const alcoholFrequency = options(["Never", "Less than monthly", "Monthly", "Weekly", "Daily or almost daily"]);
const drugFrequency = options(["Never", "Less often than once a month", "Every month", "Every week", "Daily or almost every day"]);
const history = options(["No", "Yes, but not in the last year", "Yes, during the last year"], [0, 2, 4]);
const drugHistory = options(["No", "Yes, but not over the past year", "Yes, over the past year"], [0, 2, 4]);
const question = (form: FormId, number: number, text: string, choices: Option[]): Question => ({ id: `${form}-${number}`, form, number, text, options: choices });

// WHO AUDIT, second edition (2001), standard 10-item wording.
// The Australian drink guide is supplementary; Q3 remains the standard six-drink item.
export const AUDIT: Question[] = [
  question("audit", 1, "How often do you have a drink containing alcohol?", options(["Never", "Monthly or less", "2–4 times a month", "2–3 times a week", "4 or more times a week"])),
  question("audit", 2, "How many drinks containing alcohol do you have on a typical day when you are drinking?", options(["1 or 2", "3 or 4", "5 or 6", "7, 8 or 9", "10 or more"])),
  question("audit", 3, "How often do you have six or more drinks on one occasion?", alcoholFrequency),
  question("audit", 4, "How often during the last year have you found that you were not able to stop drinking once you had started?", alcoholFrequency),
  question("audit", 5, "How often during the last year have you failed to do what was normally expected from you because of drinking?", alcoholFrequency),
  question("audit", 6, "How often during the last year have you needed a first drink in the morning to get yourself going after a heavy drinking session?", alcoholFrequency),
  question("audit", 7, "How often during the last year have you had a feeling of guilt or remorse after drinking?", alcoholFrequency),
  question("audit", 8, "How often during the last year have you been unable to remember what happened the night before because you had been drinking?", alcoholFrequency),
  question("audit", 9, "Have you or someone else been injured as a result of your drinking?", history),
  question("audit", 10, "Has a relative or friend or a doctor or another health worker been concerned about your drinking or suggested you cut down?", history),
];

// DUDIT, Europe English version 1, Karolinska Institutet (2002).
export const DUDIT: Question[] = [
  question("dudit", 1, "How often do you use drugs other than alcohol?", options(["Never", "Once a month or less often", "2–4 times a month", "2–3 times a week", "4 times a week or more often"])),
  question("dudit", 2, "Do you use more than one type of drug on the same occasion?", options(["Never", "Once a month or less often", "2–4 times a month", "2–3 times a week", "4 times a week or more often"])),
  question("dudit", 3, "How many times do you take drugs on a typical day when you use drugs?", options(["0", "1–2", "3–4", "5–6", "7 or more"])),
  question("dudit", 4, "How often are you influenced heavily by drugs?", drugFrequency),
  question("dudit", 5, "Over the past year, have you felt that your longing for drugs was so strong that you could not resist it?", drugFrequency),
  question("dudit", 6, "Has it happened, over the past year, that you have not been able to stop taking drugs once you started?", drugFrequency),
  question("dudit", 7, "How often over the past year have you taken drugs and then neglected to do something you should have done?", drugFrequency),
  question("dudit", 8, "How often over the past year have you needed to take a drug the morning after heavy drug use the day before?", drugFrequency),
  question("dudit", 9, "How often over the past year have you had guilt feelings or a bad conscience because you used drugs?", drugFrequency),
  question("dudit", 10, "Have you or anyone else been hurt (mentally or physically) because you used drugs?", drugHistory),
  question("dudit", 11, "Has a relative or a friend, a doctor or a nurse, or anyone else, been worried about your drug use or said to you that you should stop using drugs?", drugHistory),
];
export const FORMS = { audit: { name: "AUDIT", full: "Alcohol Use Disorders Identification Test", max: 40, questions: AUDIT }, dudit: { name: "DUDIT", full: "Drug Use Disorders Identification Test", max: 44, questions: DUDIT } };
export function formIds(selection: Selection): FormId[] { return selection === "both" ? ["audit", "dudit"] : [selection]; }
export function questionsFor(selection: Selection) { return formIds(selection).flatMap(id => FORMS[id].questions); }
export function setAnswer(answers: Answers, q: Question, option: Option): Answers {
  const next: Answers = { ...answers, [q.id]: { ...option } };
  if (q.id === "audit-1") {
    for (let n = 2; n <= 8; n++) {
      const id = `audit-${n}`;
      if (option.score === 0) next[id] = { score: 0, label: "Not asked: AUDIT Q1 = Never (standard routing)", skipped: true };
      else if (next[id]?.skipped) delete next[id];
    }
  }
  return next;
}
export function total(form: FormId, answers: Answers): number | null {
  const qs = FORMS[form].questions;
  if (qs.some(q => answers[q.id] === undefined)) return null;
  return qs.reduce((sum, q) => sum + answers[q.id].score, 0);
}
export function reportSummary(selection: Selection, answers: Answers, reference: string, date: string): string {
  return `AOD screening (self-report), ${new Date(date).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })} (Australia/Sydney). Session reference: ${reference || "not supplied"}. ${formIds(selection).map(id => `${FORMS[id].name}: ${total(id, answers) ?? "incomplete"}/${FORMS[id].max}`).join("; ")}. Screening scores require clinician review; no diagnosis is generated. Prototype: identity and clinical review not verified. Full item responses are in the attached report.`;
}
