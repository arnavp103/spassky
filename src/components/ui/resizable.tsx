"use client";

import {
  Group,
  Panel,
  Separator,
  type GroupProps,
  type PanelProps,
  type SeparatorProps,
} from "react-resizable-panels";

export function ResizablePanelGroup({
  className,
  ...props
}: GroupProps & { className?: string }) {
  return <Group className={className} {...props} />;
}

export function ResizablePanel({
  className,
  ...props
}: PanelProps & { className?: string }) {
  return <Panel className={className} {...props} />;
}

export function ResizableHandle({
  className,
  ...props
}: Omit<SeparatorProps, "children"> & { className?: string }) {
  return (
    <Separator
      className={`relative flex items-center justify-center ${className || ""}`}
      {...props}
    >
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm opacity-0 hover:opacity-100 transition-opacity">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="6"
          height="14"
          viewBox="0 0 6 14"
          fill="none"
          className="text-zinc-500"
        >
          <rect width="2" height="2" rx="1" fill="currentColor" />
          <rect y="6" width="2" height="2" rx="1" fill="currentColor" />
          <rect y="12" width="2" height="2" rx="1" fill="currentColor" />
          <rect x="4" width="2" height="2" rx="1" fill="currentColor" />
          <rect x="4" y="6" width="2" height="2" rx="1" fill="currentColor" />
          <rect x="4" y="12" width="2" height="2" rx="1" fill="currentColor" />
        </svg>
      </div>
    </Separator>
  );
}
