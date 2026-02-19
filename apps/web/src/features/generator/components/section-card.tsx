"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SectionCardProps {
  title: string;
  description?: string;
  onCopy?: () => void;
  children: ReactNode;
}

export function SectionCard({
  title,
  description,
  onCopy,
  children,
}: SectionCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          {description ? (
            <CardDescription>{description}</CardDescription>
          ) : null}
        </div>
        {onCopy ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCopy}
            aria-label={`${title} 복사하기`}
          >
            Copy
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}
