export type ReplyTone = "warm" | "calm" | "playful" | "firm" | "witty";

export type CommentIntentType = "civil" | "bait" | "hostile" | "curious" | "praise" | "neutral";

export interface CommentIntent {
  type: CommentIntentType;
  summary: string;
  suggestedTone: ReplyTone;
}

export interface SmartReplyResult {
  replies: string[];
  intent: CommentIntent;
}

export const REPLY_TONES: {
  id: ReplyTone;
  labelKey:
    | "inboxToneWarm"
    | "inboxToneCalm"
    | "inboxTonePlayful"
    | "inboxToneFirm"
    | "inboxToneWitty";
  promptHint: string;
}[] = [
  {
    id: "warm",
    labelKey: "inboxToneWarm",
    promptHint: "warm sincere friendly appreciative",
  },
  {
    id: "calm",
    labelKey: "inboxToneCalm",
    promptHint: "calm composed measured cool-headed non-reactive",
  },
  {
    id: "playful",
    labelKey: "inboxTonePlayful",
    promptHint: "playful light witty without being rude",
  },
  {
    id: "firm",
    labelKey: "inboxToneFirm",
    promptHint: "firm clear boundary-setting assertive but not insulting",
  },
  {
    id: "witty",
    labelKey: "inboxToneWitty",
    promptHint: "clever sharp concise with dry humor",
  },
];

export function isReplyTone(value: unknown): value is ReplyTone {
  return value === "warm" || value === "calm" || value === "playful" || value === "firm" || value === "witty";
}

export function isCommentIntentType(value: unknown): value is CommentIntentType {
  return (
    value === "civil" ||
    value === "bait" ||
    value === "hostile" ||
    value === "curious" ||
    value === "praise" ||
    value === "neutral"
  );
}

export function tonePromptHint(tone: ReplyTone): string {
  return REPLY_TONES.find((item) => item.id === tone)?.promptHint ?? REPLY_TONES[0].promptHint;
}
