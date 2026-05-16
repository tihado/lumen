"use client";

import {
  DisconnectButton,
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useTrackToggle,
  useVoiceAssistant,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Mic, MicOff, PhoneOff, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

type SlngVoiceAgentRoomProps = {
  session: {
    livekitUrl: string;
    livekitToken: string;
    roomName: string;
    callId: string;
    maxSessionSeconds?: number;
  };
  onEnded: () => void;
  onError: (message: string) => void;
};

function VoiceAgentStatus() {
  const { agent, agentTranscriptions, state } = useVoiceAssistant();
  const connectionState = useConnectionState();
  const latest = agentTranscriptions.at(-1);

  return (
    <div className="space-y-3 rounded-2xl border border-emerald-300/55 bg-[linear-gradient(135deg,oklch(0.96_0.045_165/0.96),oklch(0.98_0.02_205/0.92))] p-4 text-emerald-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 font-semibold text-sm">
          <Radio className="size-3.5" />
          Voice agent
        </span>
        <span className="rounded-full bg-white/78 px-2.5 py-1 font-medium text-[11px] capitalize shadow-sm">
          {connectionState}
        </span>
        <span className="rounded-full bg-white/78 px-2.5 py-1 font-medium text-[11px] capitalize shadow-sm">
          {agent ? state : "waiting"}
        </span>
      </div>
      {latest?.text ? (
        <p className="line-clamp-3 text-sm leading-relaxed">
          <span className="font-medium">
            {latest.final ? "Agent said: " : "Agent saying: "}
          </span>
          {latest.text}
        </p>
      ) : (
        <p className="text-sm leading-relaxed">
          Speak naturally. The agent will ask rehearsal questions and help spot
          lesson improvements.
        </p>
      )}
    </div>
  );
}

function VoiceAgentControls() {
  const {
    buttonProps: micButtonProps,
    enabled: micEnabled,
    pending: micPending,
  } = useTrackToggle({ source: Track.Source.Microphone });

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-white/75 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <button
        {...micButtonProps}
        aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}
        className={cn(
          "inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border px-3 font-medium text-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60",
          micEnabled
            ? "border-emerald-300 bg-emerald-50 text-emerald-950"
            : "border-slate-200 bg-slate-950 text-white"
        )}
        disabled={micPending || micButtonProps.disabled}
        type="button"
      >
        {micEnabled ? (
          <Mic className="size-4" />
        ) : (
          <MicOff className="size-4" />
        )}
        {micPending ? "Updating..." : micEnabled ? "Mic on" : "Muted"}
      </button>
      <DisconnectButton className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3 font-medium text-rose-700 text-sm transition hover:bg-rose-100">
        <PhoneOff className="size-4" />
        Disconnect
      </DisconnectButton>
    </div>
  );
}

export function SlngVoiceAgentRoom({
  onEnded,
  onError,
  session,
}: SlngVoiceAgentRoomProps) {
  return (
    <LiveKitRoom
      audio
      className="mt-3 space-y-3"
      connect
      onDisconnected={onEnded}
      onError={(error) => onError(error.message)}
      serverUrl={session.livekitUrl}
      token={session.livekitToken}
      video={false}
    >
      <RoomAudioRenderer />
      <VoiceAgentStatus />
      <VoiceAgentControls />
      <div className="break-words px-1 text-[11px] text-muted-foreground">
        Room {session.roomName} · Call {session.callId}
        {session.maxSessionSeconds
          ? ` · ${session.maxSessionSeconds}s limit`
          : ""}
      </div>
    </LiveKitRoom>
  );
}
