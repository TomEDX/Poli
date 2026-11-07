"use client";

import { ChevronRight, Plus, ScrollText, Vote } from "lucide-react";
import Link from "next/link";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import type { Source } from "@/modules/reference/sources/queries";
import type { TopicTree } from "@/modules/reference/topics/queries";

import { saveTextAction } from "../../actions";
import { formatFiledOn, textReference } from "../../text-labels";
import type { EditableText } from "../queries";
import { TextSheet } from "./text-sheet";

type TextTableProps = { texts: EditableText[]; topicTree: TopicTree; sources: Source[] };

export function TextTable({ texts, topicTree, sources }: TextTableProps) {
  // The sheet keeps the text it shows while it closes; null means a new text.
  const [sheet, setSheet] = useState<{ open: boolean; textId: string | null }>({ open: false, textId: null });
  const newTextButton = useRef<HTMLButtonElement>(null);
  const openButtons = useRef(new Map<string, HTMLButtonElement>());
  // Set before a text is deleted: once it is gone, the next row (or the add button) gets
  // the focus, which would otherwise fall back to the top of the page.
  const focusAfterRemoval = useRef<{ removed: string; next: string | null } | null>(null);

  useEffect(() => {
    const pending = focusAfterRemoval.current;
    if (!pending || texts.some((text) => text.id === pending.removed)) return;
    focusAfterRemoval.current = null;
    const target = pending.next ? openButtons.current.get(pending.next) : newTextButton.current;
    target?.focus();
  }, [texts]);

  const shown = texts.find((text) => text.id === sheet.textId) ?? null;
  const open = (textId: string | null) => setSheet({ open: true, textId });

  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance">Textes</h1>
          <p className="text-sm text-muted-foreground">
            Un texte apparaît sur le site une fois en ligne, rattaché à au moins une sous-thématique.
          </p>
        </div>
        {texts.length > 0 && (
          <Button ref={newTextButton} onClick={() => open(null)}>
            <Plus data-icon="inline-start" />
            Nouveau texte
          </Button>
        )}
      </div>

      {texts.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ScrollText />
            </EmptyMedia>
            <EmptyTitle>Aucun texte</EmptyTitle>
            <EmptyDescription>Ajoutez un projet ou une proposition de loi examiné à l’Assemblée.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button ref={newTextButton} onClick={() => open(null)}>
              <Plus data-icon="inline-start" />
              Nouveau texte
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-11 px-4 text-muted-foreground">Titre officiel</TableHead>
                <TableHead className="hidden h-11 px-4 text-muted-foreground lg:table-cell">Texte</TableHead>
                <TableHead className="hidden h-11 px-4 text-muted-foreground md:table-cell">Déposé le</TableHead>
                <TableHead className="h-11 px-4 text-right text-muted-foreground">En ligne</TableHead>
                <TableHead className="w-0">
                  <span className="sr-only">Amendements et scrutins</span>
                </TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Ouvrir</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {texts.map((text) => (
                <TextRow
                  key={text.id}
                  text={text}
                  openRef={(button) => {
                    if (button) openButtons.current.set(text.id, button);
                    else openButtons.current.delete(text.id);
                  }}
                  onOpen={() => open(text.id)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <TextSheet
        text={shown}
        topicTree={topicTree}
        sources={sources}
        open={sheet.open}
        onOpenChange={(isOpen) => setSheet((current) => ({ ...current, open: isOpen }))}
        returnFocus={() => (shown ? openButtons.current.get(shown.id) : newTextButton.current) ?? null}
        onRemovingText={(removing) => {
          if (!shown || !removing) {
            focusAfterRemoval.current = null;
            return;
          }
          const index = texts.indexOf(shown);
          const next = texts[index + 1] ?? texts[index - 1];
          focusAfterRemoval.current = { removed: shown.id, next: next?.id ?? null };
        }}
      />
    </div>
  );
}

type TextRowProps = {
  text: EditableText;
  openRef: React.Ref<HTMLButtonElement>;
  onOpen: () => void;
};

// The whole row opens the text; the button in it is what keyboards and screen readers reach.
function TextRow({ text, openRef, onOpen }: TextRowProps) {
  const reference = textReference(text);
  const filedOn = formatFiledOn(text.filedOn);

  return (
    <TableRow className="cursor-pointer" onClick={onOpen}>
      <TableCell className="px-4 py-3.5 whitespace-normal">
        <button
          ref={openRef}
          type="button"
          className="rounded-sm text-left font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
        >
          <span className="sr-only">Modifier </span>
          {text.officialTitle}
        </button>
        <p className="mt-0.5 text-muted-foreground lg:hidden">
          {reference}
          <span className="md:hidden"> · {filedOn}</span>
        </p>
      </TableCell>
      <TableCell className="hidden px-4 py-3.5 whitespace-nowrap lg:table-cell">{reference}</TableCell>
      <TableCell className="hidden px-4 py-3.5 whitespace-nowrap tabular-nums md:table-cell">{filedOn}</TableCell>
      <TableCell className="px-4 py-3.5 text-right" onClick={(event) => event.stopPropagation()}>
        <PublishedSwitch text={text} />
      </TableCell>
      <TableCell className="w-0 py-3.5 pr-0 pl-2" onClick={(event) => event.stopPropagation()}>
        <Link
          href={`/admin/texts/${text.id}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
          aria-label={`Amendements et scrutins : ${reference.toLowerCase()}`}
        >
          <Vote data-icon="inline-start" aria-hidden />
          <span className="hidden sm:inline">Votes</span>
        </Link>
      </TableCell>
      <TableCell className="w-10 pr-4 pl-0">
        <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
      </TableCell>
    </TableRow>
  );
}

// Publishing is the frequent task, so it stays one click away from the list.
function PublishedSwitch({ text }: { text: EditableText }) {
  const [pending, startTransition] = useTransition();
  const [published, setPublished] = useOptimistic(text.status === "published");

  return (
    <Switch
      checked={published}
      aria-label={`${textReference(text)} en ligne`}
      aria-busy={pending}
      onCheckedChange={(checked) =>
        startTransition(async () => {
          setPublished(checked);
          const result = await saveTextAction(text.id, { status: checked ? "published" : "draft" });
          if (!result.ok) toast.add({ title: result.message, type: "error" });
          else toast.add({ title: checked ? "Texte mis en ligne" : "Texte retiré du site", type: "success" });
        })
      }
    />
  );
}
