"use client";

import { useId, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { SourcePicker } from "@/modules/reference/sources/components/source-picker";
import type { ParliamentaryGroup } from "@/modules/reference/parliamentary-groups/queries";
import type { Source } from "@/modules/reference/sources/queries";
import { URL_MAX_LENGTH } from "@/modules/reference/validation";

import { createVoteAction, removeVoteAction, saveVoteAction } from "../../actions";
import { amendmentReference } from "../../amendments/vocabulary";
import type { Amendment } from "../../amendments/queries";
import {
  type GroupCounts,
  groupPositionLabels,
  groupPositions,
  voteReference,
  voteResultLabels,
  voteResults,
  voteSubjectLabels,
  voteSubjects,
} from "../vocabulary";
import { voteSchema } from "../validation";
import type { Vote } from "../queries";

type VoteSheetProps = {
  textId: string;
  // null to create a new scrutin.
  vote: Vote | null;
  groups: ParliamentaryGroup[];
  // The amendments of the text, which a scrutin on an amendment can be linked to.
  amendments: Amendment[];
  // Every source the scrutin can be linked to.
  sources: Source[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Where the focus goes once the sheet closes: the row or button that opened it.
  returnFocus: () => HTMLElement | null;
};

type TypedField = "subject" | "amendmentId" | "number" | "heldOn" | "result" | "officialUrl";

type CountsRow = Record<keyof GroupCounts, string>;

type GroupRow = { position: string; counts: CountsRow };

type Errors = Partial<Record<TypedField | "form", string>> & { groups?: Record<string, string> };

const fieldOrder: TypedField[] = ["subject", "amendmentId", "number", "heldOn", "result", "officialUrl"];

const countFields: { key: keyof GroupCounts; label: string }[] = [
  { key: "for", label: "Pour" },
  { key: "against", label: "Contre" },
  { key: "abstention", label: "Abstention" },
  { key: "nonVoting", label: "Non-votants" },
];

const blankCounts: CountsRow = { for: "", against: "", abstention: "", nonVoting: "" };

export function VoteSheet({ textId, vote, groups, amendments, sources, open, onOpenChange, returnFocus }: VoteSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 data-[side=right]:w-full sm:max-w-2xl" finalFocus={() => returnFocus() ?? true}>
        <SheetHeader className="border-b p-6">
          <SheetTitle>{vote ? "Modifier le scrutin" : "Nouveau scrutin"}</SheetTitle>
          <SheetDescription>
            {vote ? voteReference(vote) : "Le scrutin et le vote de chaque groupe s’enregistrent ensemble."}
          </SheetDescription>
        </SheetHeader>
        {/* Keyed by scrutin so the fields start again from the scrutin shown. */}
        <VoteForm
          key={vote?.id ?? "new"}
          textId={textId}
          vote={vote}
          groups={groups}
          amendments={amendments}
          sources={sources}
          onDone={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

type VoteFormProps = {
  textId: string;
  vote: Vote | null;
  groups: ParliamentaryGroup[];
  amendments: Amendment[];
  sources: Source[];
  onDone: () => void;
};

function VoteForm({ textId, vote, groups, amendments, sources, onDone }: VoteFormProps) {
  const [values, setValues] = useState<Record<TypedField, string>>(() => ({
    subject: vote?.subject ?? "",
    amendmentId: vote?.amendmentId ?? "",
    number: vote ? String(vote.number) : "",
    heldOn: vote?.heldOn ?? "",
    result: vote?.result ?? "",
    officialUrl: vote?.officialUrl ?? "",
  }));
  const [rows, setRows] = useState<Record<string, GroupRow>>(() => initialRows(vote, groups));
  const [sourceIds, setSourceIds] = useState<ReadonlySet<string>>(() => new Set(vote?.sourceIds ?? []));
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();
  const formId = useId();
  const groupsId = useId();
  const ids: Record<TypedField, string> = {
    subject: useId(),
    amendmentId: useId(),
    number: useId(),
    heldOn: useId(),
    result: useId(),
    officialUrl: useId(),
  };

  const show = (next: Errors) => {
    setErrors(next);
    const first = fieldOrder.find((field) => next[field]);
    const firstGroup = groups.find((group) => next.groups?.[group.id]);
    if (first) document.getElementById(ids[first])?.focus();
    else if (firstGroup) document.getElementById(`${groupsId}-${firstGroup.id}-position`)?.focus();
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = voteSchema.safeParse({
      ...values,
      groupVotes: groups.map((group) => ({ groupId: group.id, ...rows[group.id] })),
      sourceIds: [...sourceIds],
    });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const [field, index] = issue.path;
        if (field === "groupVotes" && typeof index === "number") {
          next.groups ??= {};
          next.groups[groups[index].id] ??= issue.message;
        } else {
          next[field as TypedField] ??= issue.message;
        }
      }
      return show(next);
    }

    startTransition(async () => {
      const result = vote ? await saveVoteAction(vote.id, parsed.data) : await createVoteAction(textId, parsed.data);
      if (!result.ok) return show({ form: result.message });
      toast.add({ title: vote ? "Modifications enregistrées" : "Scrutin ajouté", type: "success" });
      onDone();
    });
  };

  const setRow = (groupId: string, change: (row: GroupRow) => GroupRow) =>
    setRows((current) => ({ ...current, [groupId]: change(current[groupId]) }));

  const fieldProps = (field: TypedField) => ({
    id: ids[field],
    value: values[field],
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `${ids[field]}-error` : undefined,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((current) => ({ ...current, [field]: event.target.value })),
  });

  const error = (field: TypedField) => <FieldError id={`${ids[field]}-error`}>{errors[field]}</FieldError>;

  return (
    <>
      <form id={formId} noValidate onSubmit={submit} className="flex flex-1 flex-col gap-8 overflow-y-auto p-6">
        <FieldGroup>
          <div className="flex flex-wrap gap-4">
            <Field data-invalid={errors.subject ? true : undefined} className="w-auto">
              <FieldLabel htmlFor={ids.subject}>Objet</FieldLabel>
              <NativeSelect {...fieldProps("subject")} className="w-52">
                <NativeSelectOption value="" disabled>
                  Choisir…
                </NativeSelectOption>
                {voteSubjects.map((subject) => (
                  <NativeSelectOption key={subject} value={subject}>
                    {voteSubjectLabels[subject]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {error("subject")}
            </Field>
            <Field data-invalid={errors.number ? true : undefined} className="w-auto">
              <FieldLabel htmlFor={ids.number}>Numéro</FieldLabel>
              <Input {...fieldProps("number")} inputMode="numeric" autoComplete="off" className="w-28" placeholder="Ex. 412" />
              {error("number")}
            </Field>
            <Field data-invalid={errors.heldOn ? true : undefined} className="w-auto">
              <FieldLabel htmlFor={ids.heldOn}>Date</FieldLabel>
              <Input {...fieldProps("heldOn")} type="date" className="w-44" />
              {error("heldOn")}
            </Field>
            <Field data-invalid={errors.result ? true : undefined} className="w-auto">
              <FieldLabel htmlFor={ids.result}>Résultat</FieldLabel>
              <NativeSelect {...fieldProps("result")} className="w-40">
                <NativeSelectOption value="" disabled>
                  Choisir…
                </NativeSelectOption>
                {voteResults.map((result) => (
                  <NativeSelectOption key={result} value={result}>
                    {voteResultLabels[result]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {error("result")}
            </Field>
          </div>
          {values.subject === "amendment" && (
            <Field data-invalid={errors.amendmentId ? true : undefined}>
              <FieldLabel htmlFor={ids.amendmentId}>Amendement voté</FieldLabel>
              <NativeSelect {...fieldProps("amendmentId")} className="w-full">
                <NativeSelectOption value="">Aucun : l’amendement n’est pas saisi</NativeSelectOption>
                {amendments.map((amendment) => {
                  const linkedElsewhere = amendment.vote !== null && amendment.vote.id !== vote?.id;
                  return (
                    <NativeSelectOption key={amendment.id} value={amendment.id} disabled={linkedElsewhere}>
                      {amendmentReference(amendment)} · {amendment.authorLabel}
                      {linkedElsewhere && amendment.vote ? ` (déjà relié au scrutin n°\u00a0${amendment.vote.number})` : ""}
                    </NativeSelectOption>
                  );
                })}
              </NativeSelect>
              <FieldDescription>
                Le site affiche le vote des groupes sous cet amendement. Un amendement n’a qu’un scrutin public.
              </FieldDescription>
              {error("amendmentId")}
            </Field>
          )}
          <Field data-invalid={errors.officialUrl ? true : undefined}>
            <FieldLabel htmlFor={ids.officialUrl}>Lien officiel (facultatif)</FieldLabel>
            <Input
              {...fieldProps("officialUrl")}
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              maxLength={URL_MAX_LENGTH}
              placeholder="https://www.assemblee-nationale.fr/…"
            />
            {error("officialUrl")}
          </Field>
        </FieldGroup>

        <FieldSet>
          <FieldLegend>Votes des groupes</FieldLegend>
          <FieldDescription>
            Dans l’ordre officiel. La position majoritaire est obligatoire ; le décompte est facultatif, mais se
            saisit en entier.
          </FieldDescription>
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun groupe parlementaire : créez-les dans Groupes parlementaires avant de saisir leur vote.
            </p>
          ) : (
            <div className="flex flex-col divide-y">
              {groups.map((group) => (
                <GroupVoteFields
                  key={group.id}
                  idPrefix={`${groupsId}-${group.id}`}
                  group={group}
                  row={rows[group.id]}
                  error={errors.groups?.[group.id]}
                  onChange={(change) => setRow(group.id, change)}
                />
              ))}
            </div>
          )}
        </FieldSet>

        <SourcePicker sources={sources} selected={sourceIds} onChange={setSourceIds} content="le scrutin" />

        {errors.form && (
          <Alert variant="destructive">
            <AlertDescription>{errors.form}</AlertDescription>
          </Alert>
        )}

        {vote && <Deletion vote={vote} onRemoved={onDone} />}
      </form>

      <SheetFooter className="flex-row justify-end border-t p-6">
        <SheetClose render={<Button variant="outline" />}>Annuler</SheetClose>
        <Button type="submit" form={formId} disabled={pending} focusableWhenDisabled>
          {pending && <Spinner data-icon="inline-start" />}
          {pending ? "Enregistrement…" : vote ? "Enregistrer" : "Ajouter le scrutin"}
        </Button>
      </SheetFooter>
    </>
  );
}

type GroupVoteFieldsProps = {
  idPrefix: string;
  group: ParliamentaryGroup;
  row: GroupRow;
  error: string | undefined;
  onChange: (change: (row: GroupRow) => GroupRow) => void;
};

function GroupVoteFields({ idPrefix, group, row, error, onChange }: GroupVoteFieldsProps) {
  const errorId = `${idPrefix}-error`;
  const invalid = error ? true : undefined;

  return (
    <FieldSet data-invalid={invalid} className="gap-3 py-4">
      <FieldLegend variant="label">
        {group.name} <span className="font-normal text-muted-foreground">({group.abbreviation})</span>
      </FieldLegend>
      <div className="grid gap-3">
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-position`} className="text-xs text-muted-foreground">
            Position majoritaire
          </FieldLabel>
          <NativeSelect
            id={`${idPrefix}-position`}
            value={row.position}
            aria-invalid={invalid}
            aria-describedby={error ? errorId : undefined}
            className="w-40"
            onChange={(event) => onChange((current) => ({ ...current, position: event.target.value }))}
          >
            <NativeSelectOption value="" disabled>
              Choisir…
            </NativeSelectOption>
            {groupPositions.map((position) => (
              <NativeSelectOption key={position} value={position}>
                {groupPositionLabels[position]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <div className="grid grid-cols-4 gap-2">
          {countFields.map(({ key, label }) => (
            <Field key={key} className="min-w-0 gap-1.5">
              <FieldLabel htmlFor={`${idPrefix}-${key}`} className="text-xs text-muted-foreground">
                {label}
              </FieldLabel>
              <Input
                id={`${idPrefix}-${key}`}
                value={row.counts[key]}
                inputMode="numeric"
                autoComplete="off"
                aria-invalid={invalid}
                aria-describedby={error ? errorId : undefined}
                className="tabular-nums"
                onChange={(event) =>
                  onChange((current) => ({ ...current, counts: { ...current.counts, [key]: event.target.value } }))
                }
              />
            </Field>
          ))}
        </div>
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </FieldSet>
  );
}

// Kept at the bottom of the sheet, away from the list: deleting is rare and cannot be undone.
function Deletion({ vote, onRemoved }: { vote: Vote; onRemoved: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const remove = () => {
    setConfirming(false);
    startTransition(async () => {
      const result = await removeVoteAction(vote.id);
      if (!result.ok) {
        toast.add({ title: result.message, type: "error" });
        return;
      }
      toast.add({ title: "Scrutin supprimé", type: "success" });
      onRemoved();
    });
  };

  return (
    <>
      <FieldSeparator />
      <FieldSet>
        <FieldLegend>Suppression</FieldLegend>
        <FieldDescription>Le scrutin et le vote des groupes disparaissent du site. La suppression est définitive.</FieldDescription>
        <div>
          <Button type="button" variant="destructive" disabled={pending} onClick={() => setConfirming(true)}>
            Supprimer le scrutin
          </Button>
        </div>
      </FieldSet>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le {voteReference(vote).toLowerCase()} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Il disparaît du site avec le vote de chaque groupe. Cette action est définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Supprimer le scrutin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Every group of the legislature gets a row, filled from the scrutin when it has voted in it.
function initialRows(vote: Vote | null, groups: ParliamentaryGroup[]): Record<string, GroupRow> {
  const rows: Record<string, GroupRow> = {};
  for (const group of groups) {
    const cast = vote?.groupVotes.find((groupVote) => groupVote.groupId === group.id);
    rows[group.id] = {
      position: cast?.position ?? "",
      counts: cast?.counts
        ? {
            for: String(cast.counts.for),
            against: String(cast.counts.against),
            abstention: String(cast.counts.abstention),
            nonVoting: String(cast.counts.nonVoting),
          }
        : blankCounts,
    };
  }
  return rows;
}

