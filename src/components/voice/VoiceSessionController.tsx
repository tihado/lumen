"use client";

import { Mic, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type VoiceSessionControllerProps = {
  transcript: string;
  onTranscriptChange: (value: string) => void;
  disabled?: boolean;
};

type BrowserRecognition = {
  start: () => void;
  stop: () => void;
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((ev: Event) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => BrowserRecognition;
  webkitSpeechRecognition?: new () => BrowserRecognition;
};

type BrowserRecognitionResult = {
  readonly isFinal: boolean;
  readonly 0?: {
    readonly transcript?: string;
  };
};

type BrowserRecognitionResultListLike = {
  readonly length: number;
  readonly [index: number]: BrowserRecognitionResult | undefined;
};

function cleanSpeechText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function joinTranscriptParts(parts: string[]) {
  return parts.map(cleanSpeechText).filter(Boolean).join(" ");
}

/** Typed transcript + optional browser SpeechRecognition (where supported). SLNG client wiring can replace internals later. */
export function VoiceSessionController({
  transcript,
  onTranscriptChange,
  disabled,
}: VoiceSessionControllerProps) {
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<BrowserRecognition | null>(null);
  const dictationBaseRef = useRef("");
  const transcriptRef = useRef(transcript);
  transcriptRef.current = transcript;

  useEffect(() => {
    const w =
      typeof window === "undefined" ? undefined : (window as SpeechWindow);
    const SR = w && (w.SpeechRecognition || w.webkitSpeechRecognition);
    setSpeechSupported(Boolean(SR));
  }, []);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    const SR =
      (window as SpeechWindow).SpeechRecognition ||
      (window as SpeechWindow).webkitSpeechRecognition;
    if (typeof SR !== "function") {
      return;
    }
    const rec = new (SR as new () => BrowserRecognition)();
    dictationBaseRef.current = transcriptRef.current;
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (event: Event) => {
      const ev = event as unknown as {
        results: BrowserRecognitionResultListLike;
      };
      const finalParts: string[] = [];
      const interimParts: string[] = [];
      for (let i = 0; i < ev.results.length; i++) {
        const result = ev.results[i];
        const text = result?.[0]?.transcript ?? "";
        if (!(result && text)) {
          continue;
        }
        if (result.isFinal) {
          finalParts.push(text);
        } else {
          interimParts.push(text);
        }
      }
      const speechText = joinTranscriptParts([...finalParts, ...interimParts]);
      if (speechText) {
        onTranscriptChange(
          joinTranscriptParts([dictationBaseRef.current, speechText])
        );
      }
    };
    rec.onerror = () => {
      stopListening();
    };
    rec.onend = () => {
      setListening(false);
    };
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, [onTranscriptChange, stopListening]);

  useEffect(
    () => () => {
      stopListening();
    },
    [stopListening]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-muted-foreground text-xs" htmlFor="transcript">
          Lesson intent (typed or dictated)
        </Label>
        {speechSupported ? (
          <Button
            disabled={disabled}
            onClick={() => (listening ? stopListening() : startListening())}
            size="sm"
            type="button"
            variant={listening ? "destructive" : "outline"}
          >
            {listening ? (
              <>
                <Square className="size-3.5" />
                Stop
              </>
            ) : (
              <>
                <Mic className="size-3.5" />
                Dictate
              </>
            )}
          </Button>
        ) : (
          <span className="text-[10px] text-muted-foreground">
            Browser STT unavailable — type below. Configure SLNG for live voice.
          </span>
        )}
      </div>
      <Textarea
        className={cn("min-h-[140px] resize-y text-sm")}
        disabled={disabled}
        id="transcript"
        onChange={(e) => onTranscriptChange(e.target.value)}
        placeholder='Example: "20-minute photosynthesis lesson for grade 6, hands-on, include a misconception check."'
        value={transcript}
      />
    </div>
  );
}
