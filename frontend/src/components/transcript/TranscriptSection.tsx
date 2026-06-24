import type { ReactNode } from "react";

interface TranscriptSectionProps {
  minute: number;
  children: ReactNode;
}

export function TranscriptSection({ minute, children }: TranscriptSectionProps) {
  return (
    <div>
      <div className="text-sm font-bold text-gray-200 tracking-widest mb-4">
        MINUTE {minute}
      </div>
      <div className="relative pl-8">
        <div className="absolute left-3 top-2 bottom-0 w-px bg-gray-700" />
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}
