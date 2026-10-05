import type { VideoAiSuggestion, VideoAsset, VideoInteraction } from "@/lib/types";
import { DEFAULT_MAX_ATTEMPTS, fmtTime, parseTime } from "@/lib/interactive-video/engine";

/**
 * Question suggestion (spec section 26.3, "AI question generation"). A
 * generator reads the video's transcript and proposes questions with times.
 * Suggestions are only ever proposals: they are stored as pending, a teacher
 * accepts one into a draft, edits it there, and publishes the draft. Nothing a
 * generator writes reaches students on its own.
 *
 * In production cpback runs the generator as a queued job (an LLM reading the
 * transcript, or the speech-to-text of an uploaded file) behind this same
 * interface. The prototype ships a rule-based generator that works offline.
 */
export interface SuggestionRequest {
  video: Pick<VideoAsset, "title" | "transcript" | "durationSeconds">;
  /** Questions already in the draft; suggestions keep clear of their times. */
  existing: Pick<VideoInteraction, "timestamp" | "question">[];
  count: number;
}

export interface QuestionGenerator {
  id: string;
  label: string;
  generate(req: SuggestionRequest): Promise<Pick<VideoAiSuggestion, "suggestion" | "rationale">[]>;
}

/** Transcript lines look like "[1:05] The router sends each packet…"; untimed lines are spread evenly. */
export function transcriptLines(transcript: string, duration: number): { at: number; text: string }[] {
  const raw = transcript.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  return raw.map((line, n) => {
    const m = /^\[(\d+(?::\d{2}){1,2})\]\s*(.*)$/.exec(line);
    const at = m ? (parseTime(m[1]!) ?? 0) : raw.length > 1 ? (duration * (n + 1)) / (raw.length + 1) : duration / 2;
    return { at, text: (m ? m[2]! : line).trim() };
  });
}

/**
 * Offline generator: turns statements in the transcript into true/false checks
 * a few seconds after they're said, away from questions already placed. It is
 * deliberately simple: what matters is the review-then-publish workflow.
 */
export const transcriptGenerator: QuestionGenerator = {
  id: "transcript-rules-v1",
  label: "Transcript checks",
  async generate({ video, existing, count }) {
    const lines = transcriptLines(video.transcript ?? "", video.durationSeconds);
    const taken = existing.map((e) => e.timestamp);
    const out: Pick<VideoAiSuggestion, "suggestion" | "rationale">[] = [];
    for (const l of lines) {
      if (out.length >= count) break;
      const sentence = l.text.split(/(?<=[.!?])\s+/).find((x) => x.split(/\s+/).length >= 6 && x.split(/\s+/).length <= 28);
      if (!sentence) continue;
      const at = Math.min(Math.max(0, video.durationSeconds - 1), Math.round(l.at + 4));
      if (taken.some((t) => Math.abs(t - at) < 20) || existing.some((e) => e.question.includes(sentence))) continue;
      taken.push(at);
      out.push({
        rationale: `Said at ${fmtTime(l.at)}: “${sentence}”`,
        suggestion: {
          type: "true_false",
          timestamp: at,
          title: "Check your understanding",
          question: `True or false: ${sentence.replace(/[.!?]$/, "")}.`,
          options: [
            { id: "", text: "True", correct: true },
            { id: "", text: "False", correct: false },
          ],
          explanation: `The video says: “${sentence}”`,
          points: 1,
          required: false,
          allowRetry: true,
          maxAttempts: DEFAULT_MAX_ATTEMPTS,
          showFeedback: true,
          pauseVideo: true,
          resumeAfterSubmit: false,
          displayPosition: "center",
        },
      });
    }
    return out;
  },
};

export const GENERATORS: QuestionGenerator[] = [transcriptGenerator];
