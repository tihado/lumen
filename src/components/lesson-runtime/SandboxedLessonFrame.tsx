"use client";

type SandboxedLessonFrameProps = {
  html: string;
  title: string;
};

export function SandboxedLessonFrame({
  html,
  title,
}: SandboxedLessonFrameProps) {
  return (
    <iframe
      allow="microphone; autoplay"
      className="block min-h-screen w-full border-0 bg-background"
      referrerPolicy="no-referrer"
      sandbox="allow-scripts"
      srcDoc={html}
      title={title}
    />
  );
}
