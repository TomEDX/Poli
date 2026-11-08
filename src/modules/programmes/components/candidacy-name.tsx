import { PartyLogo } from "@/modules/reference/parties/components/party-logo";
import type { PublishedCandidacy } from "@/modules/reference/parties/queries";

// The logo is hidden from screen readers: the label already names the candidacy and its party.
export function CandidacyName({ candidacy }: { candidacy: PublishedCandidacy }) {
  return (
    <>
      <span aria-hidden>
        <PartyLogo party={candidacy.party} className="size-8" />
      </span>
      {candidacy.label}
    </>
  );
}
