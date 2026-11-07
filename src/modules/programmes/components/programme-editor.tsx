"use client";

import { ArrowDown, ArrowLeft, ArrowUp, Plus, TextQuote } from "lucide-react";
import Link from "next/link";
import { useId, useOptimistic, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import type { Party } from "@/modules/reference/parties";
import type { Source } from "@/modules/reference/sources";
import type { Direction, TopicTree } from "@/modules/reference/topics";

import { moveExtractAction, saveExtractAction } from "../actions";
import { formatRecordedOn } from "../extract-labels";
import type { EditableExtract, MissingSubtopics } from "../extracts";
import { ExtractSheet } from "./extract-sheet";

// As the administration lists it, drafts included.
export type ProgrammeCandidacy = NonNullable<Party["candidacy"]>;

type ProgrammeEditorProps = {
  candidacy: ProgrammeCandidacy;
  extracts: EditableExtract[];
  missingSubtopics: MissingSubtopics;
  topicTree: TopicTree;
  sources: Source[];
};

// The extracts of one subtopic, which the comparator shows together and the editors order.
type SubtopicGroup = { id: string; name: string; topicName: string; extracts: EditableExtract[] };

export function ProgrammeEditor({ candidacy, extracts, missingSubtopics, topicTree, sources }: ProgrammeEditorProps) {
  // The sheet keeps the extract it shows while it closes; null means a new extract.
  const [sheet, setSheet] = useState<{ open: boolean; extractId: string | null; newSubtopicId: string | null }>({
    open: false,
    extractId: null,
    newSubtopicId: null,
  });
  const newExtractButton = useRef<HTMLButtonElement>(null);
  const openButtons = useRef(new Map<string, HTMLButtonElement>());
  const extractsHeadingId = useId();

  const shown = extracts.find((extract) => extract.id === sheet.extractId) ?? null;
  const open = (extractId: string | null, newSubtopicId: string | null = null) =>
    setSheet({ open: true, extractId, newSubtopicId });
  const groups = groupBySubtopic(extracts, topicTree);

  return (
    <div className="flex max-w-5xl flex-col gap-10">
      <div className="flex flex-col gap-6">
        <Link
          href="/admin/programmes"
          className="flex w-fit items-center gap-1 rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Tous les programmes
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance">
              Programme de {candidacy.label}
            </h1>
            <p className="text-sm text-muted-foreground">
              {candidacy.status === "published"
                ? "Les extraits en ligne apparaissent dans le comparateur."
                : "Candidature en brouillon : ses extraits n’apparaîtront qu’une fois la candidature en ligne."}
            </p>
          </div>
          {extracts.length > 0 && (
            <Button ref={newExtractButton} onClick={() => open(null)}>
              <Plus data-icon="inline-start" />
              Nouvel extrait
            </Button>
          )}
        </div>
      </div>

      <section aria-labelledby={extractsHeadingId} className="flex flex-col gap-6">
        <h2 id={extractsHeadingId} className="sr-only">
          Extraits
        </h2>
        {extracts.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TextQuote />
              </EmptyMedia>
              <EmptyTitle>Aucun extrait</EmptyTitle>
              <EmptyDescription>Collez une citation du programme et rangez-la dans sa sous-thématique.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button ref={newExtractButton} onClick={() => open(null)}>
                <Plus data-icon="inline-start" />
                Nouvel extrait
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          groups.map((group) => (
            <SubtopicExtracts
              key={group.id}
              group={group}
              onOpen={open}
              openRef={(extractId, button) => {
                if (button) openButtons.current.set(extractId, button);
                else openButtons.current.delete(extractId);
              }}
            />
          ))
        )}
      </section>

      <MissingSubtopicList missingSubtopics={missingSubtopics} onAdd={(subtopicId) => open(null, subtopicId)} />

      <ExtractSheet
        candidacy={candidacy}
        extract={shown}
        newSubtopicId={sheet.newSubtopicId}
        topicTree={topicTree}
        sources={sources}
        open={sheet.open}
        onOpenChange={(isOpen) => setSheet((current) => ({ ...current, open: isOpen }))}
        returnFocus={() => (shown ? openButtons.current.get(shown.id) : newExtractButton.current) ?? null}
      />
    </div>
  );
}

type SubtopicExtractsProps = {
  group: SubtopicGroup;
  onOpen: (extractId: string) => void;
  openRef: (extractId: string, button: HTMLButtonElement | null) => void;
};

function SubtopicExtracts({ group, onOpen, openRef }: SubtopicExtractsProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="flex flex-wrap items-baseline gap-x-2 font-semibold">
        {group.name}
        <span className="text-sm font-normal text-muted-foreground">{group.topicName}</span>
      </h3>
      <ol className="flex flex-col divide-y overflow-hidden rounded-xl border">
        {group.extracts.map((extract, index) => (
          <ExtractRow
            key={extract.id}
            extract={extract}
            name={`l’extrait ${index + 1} (${group.name})`}
            isFirst={index === 0}
            isLast={index === group.extracts.length - 1}
            openRef={(button) => openRef(extract.id, button)}
            onOpen={() => onOpen(extract.id)}
          />
        ))}
      </ol>
    </section>
  );
}

type ExtractRowProps = {
  extract: EditableExtract;
  // What screen readers call it: its place within its subtopic, which every control repeats.
  name: string;
  isFirst: boolean;
  isLast: boolean;
  openRef: React.Ref<HTMLButtonElement>;
  onOpen: () => void;
};

function ExtractRow({ extract, name, isFirst, isLast, openRef, onOpen }: ExtractRowProps) {
  const [moving, startMove] = useTransition();
  const sourceCount = extract.sourceIds.length;

  const move = (direction: Direction) =>
    startMove(async () => {
      const result = await moveExtractAction(extract.id, direction);
      if (!result.ok) toast.add({ title: result.message, type: "error" });
    });

  return (
    <li className="flex items-start gap-3 px-4 py-3.5 text-sm">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <button
          ref={openRef}
          type="button"
          onClick={onOpen}
          className="rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="sr-only">Modifier {name} : </span>
          <span className="line-clamp-3 text-pretty whitespace-pre-line">
            {"«\u00a0"}
            {extract.quote}
            {"\u00a0»"}
          </span>
        </button>
        <p className="text-muted-foreground">
          Relevé le {formatRecordedOn(extract.recordedOn)}
          {sourceCount > 0 && ` · ${sourceCount} source${sourceCount > 1 ? "s" : ""}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Monter ${name}`}
          title="Monter"
          disabled={moving || isFirst}
          onClick={() => move("up")}
        >
          <ArrowUp />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Descendre ${name}`}
          title="Descendre"
          disabled={moving || isLast}
          onClick={() => move("down")}
        >
          <ArrowDown />
        </Button>
        <PublishedSwitch extract={extract} name={name} />
      </div>
    </li>
  );
}

// Publishing is the frequent task, so it stays one click away from the list.
function PublishedSwitch({ extract, name }: { extract: EditableExtract; name: string }) {
  const [pending, startTransition] = useTransition();
  const [published, setPublished] = useOptimistic(extract.status === "published");

  return (
    <Switch
      checked={published}
      aria-label={`${name.charAt(0).toUpperCase()}${name.slice(1)} en ligne`}
      aria-busy={pending}
      className="ml-2"
      onCheckedChange={(checked) =>
        startTransition(async () => {
          setPublished(checked);
          const result = await saveExtractAction(extract.id, { status: checked ? "published" : "draft" });
          if (!result.ok) toast.add({ title: result.message, type: "error" });
          else toast.add({ title: checked ? "Extrait mis en ligne" : "Extrait retiré du site", type: "success" });
        })
      }
    />
  );
}

// What remains to read in the programme; each subtopic opens a new extract already filed under it.
function MissingSubtopicList({
  missingSubtopics,
  onAdd,
}: {
  missingSubtopics: MissingSubtopics;
  onAdd: (subtopicId: string) => void;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="font-heading text-xl font-semibold tracking-tight">
          Sous-thématiques sans extrait
        </h2>
        <p className="text-sm text-muted-foreground">
          {missingSubtopics.length === 0
            ? "Chaque sous-thématique a au moins un extrait, en ligne ou en brouillon."
            : "Rien n’y est encore relevé, ni en ligne ni en brouillon. Le comparateur y affichera « rien dans le programme »."}
        </p>
      </div>
      {missingSubtopics.map((topic) => (
        <div key={topic.id} className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">{topic.name}</h3>
          <ul className="flex flex-wrap gap-2">
            {topic.subtopics.map((subtopic) => (
              <li key={subtopic.id}>
                <Button variant="outline" size="sm" onClick={() => onAdd(subtopic.id)}>
                  <Plus data-icon="inline-start" />
                  <span className="sr-only">Ajouter un extrait en </span>
                  {subtopic.name}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

// The extracts come in the order of the programme, so each subtopic's extracts are consecutive.
function groupBySubtopic(extracts: EditableExtract[], topicTree: TopicTree): SubtopicGroup[] {
  const names = new Map(
    topicTree.flatMap((topic) => topic.subtopics.map((subtopic) => [subtopic.id, { name: subtopic.name, topicName: topic.name }])),
  );
  const groups: SubtopicGroup[] = [];
  for (const extract of extracts) {
    const last = groups.at(-1);
    if (last?.id === extract.subtopicId) last.extracts.push(extract);
    else groups.push({ id: extract.subtopicId, ...(names.get(extract.subtopicId) ?? { name: "", topicName: "" }), extracts: [extract] });
  }
  return groups;
}
