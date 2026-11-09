"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

import {
  natureParamValues,
  oldestFirstParamValue,
  type TextListSelection,
  textListHref,
  textListParamNames,
  textListPath,
} from "../list-params";
import type { TextTopic } from "../queries";

/**
 * The filters and sort of the public list. Applied with a button rather than on each change,
 * so that browsing a select with the arrow keys does not reload the list at every step.
 * Without JavaScript, the form still works as a plain GET form.
 */
export function TextListFilters({ topics, selection }: { topics: TextTopic[]; selection: TextListSelection }) {
  const router = useRouter();
  const ids = { topic: useId(), subtopic: useId(), nature: useId(), order: useId() };
  const [topic, setTopic] = useState(selection.topic);
  const [subtopic, setSubtopic] = useState(selection.subtopic);
  const subtopics = topics.find((candidate) => candidate.slug === topic)?.subtopics ?? [];
  const narrowed = Object.values(selection).some(Boolean);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (key: keyof TextListSelection) => String(form.get(textListParamNames[key]) ?? "");
    const href = textListHref({
      topic: value("topic"),
      subtopic: value("subtopic"),
      nature: value("nature"),
      order: value("order"),
    });
    router.push(href, { scroll: false });
  }

  return (
    <form
      action={textListPath}
      onSubmit={apply}
      aria-label="Filtrer et trier les textes"
      className="flex flex-col gap-4 rounded-xl border p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={ids.topic}>Thématique</FieldLabel>
          <NativeSelect
            id={ids.topic}
            name={textListParamNames.topic}
            value={topic}
            onChange={(event) => {
              setTopic(event.target.value);
              setSubtopic("");
            }}
            className="w-full"
          >
            <NativeSelectOption value="">Toutes les thématiques</NativeSelectOption>
            {topics.map((candidate) => (
              <NativeSelectOption key={candidate.id} value={candidate.slug}>
                {candidate.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field data-disabled={subtopics.length === 0}>
          <FieldLabel htmlFor={ids.subtopic}>Sous-thématique</FieldLabel>
          <NativeSelect
            id={ids.subtopic}
            name={textListParamNames.subtopic}
            value={subtopic}
            onChange={(event) => setSubtopic(event.target.value)}
            disabled={subtopics.length === 0}
            className="w-full"
          >
            <NativeSelectOption value="">
              {topic ? "Toutes les sous-thématiques" : "Choisissez d’abord une thématique"}
            </NativeSelectOption>
            {subtopics.map((candidate) => (
              <NativeSelectOption key={candidate.id} value={candidate.slug}>
                {candidate.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor={ids.nature}>Type de texte</FieldLabel>
          <NativeSelect
            id={ids.nature}
            name={textListParamNames.nature}
            defaultValue={selection.nature}
            className="w-full"
          >
            <NativeSelectOption value="">Projets et propositions de loi</NativeSelectOption>
            <NativeSelectOption value={natureParamValues.government_bill}>Projets de loi</NativeSelectOption>
            <NativeSelectOption value={natureParamValues.member_bill}>Propositions de loi</NativeSelectOption>
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor={ids.order}>Ordre</FieldLabel>
          <NativeSelect
            id={ids.order}
            name={textListParamNames.order}
            defaultValue={selection.order}
            className="w-full"
          >
            <NativeSelectOption value="">Les plus récemment déposés d’abord</NativeSelectOption>
            <NativeSelectOption value={oldestFirstParamValue}>Les plus anciennement déposés d’abord</NativeSelectOption>
          </NativeSelect>
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit">Afficher les textes</Button>
        {narrowed && (
          <Link href={textListPath} scroll={false} className={buttonVariants({ variant: "ghost" })}>
            Effacer les filtres
          </Link>
        )}
      </div>
    </form>
  );
}
