"use client";

// PROTOTYPE, throwaway. Variant A: icon tabs always pinned above the candidacy names.
// Wide screen: one fixed column per candidacy. Phone: stacked quotes, each with a small badge,
// and the pinned names act as a legend.

import {
  AddCandidacy,
  CandidacyBadge,
  CandidacyChip,
  candidacyOf,
  EmptySubtopic,
  FirstChoice,
  isEmptySubtopic,
  NothingHere,
  type PrototypeProps,
  Quote,
  TopicTabs,
  useComparisonNav,
} from "./shared";

export function VariantA({ candidacies, chosen, grid, selection, variant }: PrototypeProps) {
  const nav = useComparisonNav(selection, variant);
  const topic = grid.find((candidate) => candidate.slug === selection.topic);
  // The last column holds the "+" so the quotes line up under their names.
  const columns = { gridTemplateColumns: "repeat(" + chosen.length + ", minmax(0, 1fr)) 7.5rem" };

  if (chosen.length === 0) return <FirstChoice candidacies={candidacies} onAdd={nav.add} />;

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-20 -mx-4 border-b bg-background/95 backdrop-blur md:-mx-8">
        <div className="border-b">
          <TopicTabs grid={grid} selection={selection} variant={variant} />
        </div>
        <div className="px-4 py-2 md:px-8">
          <div className="hidden gap-4 md:grid" style={columns}>
            {chosen.map((candidacy) => (
              <CandidacyChip key={candidacy.id} candidacy={candidacy} onRemove={() => nav.remove(candidacy.id)} />
            ))}
            <AddCandidacy candidacies={candidacies} selection={selection} onAdd={nav.add} className="justify-self-end" />
          </div>
          <div className="flex items-center gap-3 md:hidden">
            {chosen.map((candidacy) => (
              <CandidacyChip
                key={candidacy.id}
                compact
                candidacy={candidacy}
                onRemove={() => nav.remove(candidacy.id)}
                className="rounded-full border py-0.5 pr-0.5 pl-1"
              />
            ))}
            <AddCandidacy candidacies={candidacies} selection={selection} onAdd={nav.add} label="" className="ml-auto" />
          </div>
        </div>
      </div>

      {topic && (
        <section aria-labelledby="compared-topic" className="flex flex-col gap-6 pt-6" data-pending={nav.pending || undefined}>
          <h2 id="compared-topic" className="font-heading text-2xl font-semibold tracking-tight">
            {topic.name}
          </h2>
          {topic.subtopics.map((subtopic) =>
            isEmptySubtopic(subtopic) ? (
              <EmptySubtopic key={subtopic.id} name={subtopic.name} />
            ) : (
              <section key={subtopic.id} className="flex flex-col gap-3">
                <h3 className="font-heading text-lg font-semibold">{subtopic.name}</h3>
                <div className="hidden gap-4 md:grid" style={columns}>
                  {subtopic.cells.map((cell) => (
                    <div key={cell.candidacyId} className="flex flex-col gap-4 border-t pt-3">
                      {cell.extracts.length === 0 ? (
                        <NothingHere />
                      ) : (
                        cell.extracts.map((extract) => <Quote key={extract.id} extract={extract} />)
                      )}
                    </div>
                  ))}
                </div>
                <ul className="flex flex-col gap-3 md:hidden">
                  {subtopic.cells.map((cell) => {
                    const candidacy = candidacyOf(chosen, cell.candidacyId);
                    if (!candidacy) return null;
                    return (
                      <li key={cell.candidacyId} className="flex flex-col gap-3 rounded-xl border bg-card p-3">
                        <CandidacyBadge candidacy={candidacy} />
                        {cell.extracts.length === 0 ? (
                          <NothingHere />
                        ) : (
                          cell.extracts.map((extract) => <Quote key={extract.id} extract={extract} />)
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ),
          )}
        </section>
      )}
    </div>
  );
}
