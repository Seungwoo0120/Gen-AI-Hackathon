// Minimal types for the Web Speech API recognition interface, which TypeScript's
// DOM library does not ship. Only the parts this app uses.

export interface RecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

export interface RecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: RecognitionAlternative;
}

export interface RecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: { readonly length: number; readonly [index: number]: RecognitionResult };
}

export interface RecognitionErrorEvent extends Event {
  readonly error: string;
}

export interface Recognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

type RecognitionConstructor = new () => Recognition;

/** The browser's recognition constructor (standard or webkit-prefixed), if any. */
export function getRecognitionConstructor(): RecognitionConstructor | undefined {
  const scope = globalThis as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
}
