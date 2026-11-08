import { cn } from "cn";

type PartyLogoProps = {
  party: { name: string; abbreviation: string; logo: string | null };
  className?: string;
};

// Every party takes the same white square, so lists line up whether its logo is known or not.
export function PartyLogo({ party, className }: PartyLogoProps) {
  if (party.logo === null) {
    return (
      <span
        role="img"
        aria-label={party.name}
        className={cn(
          "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted p-0.5 text-center text-[0.625rem] leading-tight font-semibold text-muted-foreground [overflow-wrap:anywhere]",
          className,
        )}
      >
        <span aria-hidden className="line-clamp-2">
          {party.abbreviation}
        </span>
      </span>
    );
  }
  return (
    // A plain img, never inlined: a script inside an SVG logo then never runs (ADR 0009).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={party.logo}
      alt={party.name}
      className={cn("size-10 shrink-0 rounded-md border bg-white object-contain p-1", className)}
    />
  );
}
