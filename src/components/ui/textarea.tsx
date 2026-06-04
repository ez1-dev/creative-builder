import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, id, name, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, placeholder, title, ...props }, ref) => {
    const autoId = React.useId();
    const finalId = id ?? autoId;
    const finalName = name ?? finalId;
    const finalAriaLabel =
      ariaLabel ?? (ariaLabelledBy ? undefined : title ?? placeholder ?? undefined);
    return (
      <textarea
        id={finalId}
        name={finalName}
        placeholder={placeholder}
        title={title}
        aria-label={finalAriaLabel}
        aria-labelledby={ariaLabelledBy}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
