"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

interface CollapsibleTextProps {
  text: string;
  limit?: number;
}

export function CollapsibleText({ text, limit = 220 }: CollapsibleTextProps) {
  const [expanded, setExpanded] = useState(false);
  const shouldCollapse = text.length > limit;

  const displayText = useMemo(() => {
    if (expanded || !shouldCollapse) return text;
    return `${text.slice(0, limit)}...`;
  }, [expanded, limit, shouldCollapse, text]);

  return (
    <div className="space-y-2">
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
        {displayText}
      </p>
      {shouldCollapse ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((value) => !value)}
          className="h-7 px-2"
        >
          {expanded ? "접기" : "펼치기"}
        </Button>
      ) : null}
    </div>
  );
}
