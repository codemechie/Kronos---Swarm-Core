import type { ReactNode } from "react";

interface TranscriptSectionProps {
  minute: number;
  children: ReactNode;
}

export function TranscriptSection({ minute, children }: TranscriptSectionProps) {
  return (
    <div>
      <div className="text-xs tracking-widest text-gray-600 mb-4">
        MINUTE {minute}
      </div>
      <div className="relative pl-6">
        <div className="absolute left-[7px] top-2 bottom-0 w-px bg-gray-800" />
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}
