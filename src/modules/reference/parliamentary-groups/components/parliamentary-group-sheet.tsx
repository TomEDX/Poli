"use client";

import { useId, useState, useTransition } from "react";
import type { z } from "zod";

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
import { Checkbox } from "@/components/ui/checkbox";
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

import {
  createParliamentaryGroupAction,
  removeParliamentaryGroupAction,
  saveParliamentaryGroupAction,
} from "../actions";
import { groupAbbreviationTakenMessage, groupNameTakenMessage } from "../vocabulary";
import type { ParliamentaryGroup, ParliamentaryGroupChanges, ParliamentaryGroupInput, PartySummary } from "../queries";
import { ABBREVIATION_MAX_LENGTH, NAME_MAX_LENGTH } from "../../form-fields";
import { newParliamentaryGroupSchema, type parliamentaryGroupChangesSchema } from "../validation";

type ParliamentaryGroupSheetProps = {
  // null to create a new group.
  group: ParliamentaryGroup | null;
  parties: PartySummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Where the focus goes once the sheet closes: the row or button that opened it.
  returnFocus: () => HTMLElement | null;
};

export function ParliamentaryGroupSheet({ group, parties, open, onOpenChange, returnFocus }: ParliamentaryGroupSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 data-[side=right]:w-full sm:max-w-md" finalFocus={() => returnFocus() ?? true}>
        <SheetHeader className="border-b p-6">
          <SheetTitle>{group ? group.name : "Nouveau groupe parlementaire"}</SheetTitle>
          <SheetDescription>
            {group ? "Modifiez le groupe et les partis qui lui sont reliés." : "Le groupe se place en fin de liste."}
          </SheetDescription>
        </SheetHeader>
        {/* Keyed by group so the fields start again from the group shown. */}
        <GroupForm key={group?.id ?? "new"} group={group} parties={parties} onDone={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}

type Errors = { name?: string; abbreviation?: string; form?: string };

type GroupFormProps = { group: ParliamentaryGroup | null; parties: PartySummary[]; onDone: () => void };

function GroupForm({ group, parties, onDone }: GroupFormProps) {
  const [name, setName] = useState(group?.name ?? "");
  const [abbreviation, setAbbreviation] = useState(group?.abbreviation ?? "");
  const [partyIds, setPartyIds] = useState<Set<string>>(() => new Set(group?.parties.map((party) => party.id)));
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();
  const formId = useId();
  const ids = { name: useId(), abbreviation: useId(), parties: useId() };

  const show = (next: Errors) => {
    setErrors(next);
    const first = (["name", "abbreviation"] as const).find((field) => next[field]);
    if (first) document.getElementById(ids[first])?.focus();
  };

  const toggleParty = (id: string, checked: boolean) =>
    setPartyIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = newParliamentaryGroupSchema.safeParse({ name, abbreviation, partyIds: [...partyIds] });
    if (!parsed.success) {
      const message = (field: string) => parsed.error.issues.find((issue) => issue.path.at(-1) === field)?.message;
      return show({ name: message("name"), abbreviation: message("abbreviation") });
    }
    const values = parsed.data;

    startTransition(async () => {
      const changes = group ? changesFrom(group, values) : null;
      if (changes && Object.keys(changes).length === 0) return onDone();
      const result =
        changes && group ? await saveParliamentaryGroupAction(group.id, changes) : await createParliamentaryGroupAction(values);
      if (!result.ok) return show(serverErrors(result.message, values));
      toast.add({ title: group ? "Modifications enregistrées" : `Groupe « ${values.name} » créé`, type: "success" });
      onDone();
    });
  };

  return (
    <>
      <form id={formId} noValidate onSubmit={submit} className="flex flex-1 flex-col gap-8 overflow-y-auto p-6">
        <FieldSet>
          <FieldLegend>Groupe</FieldLegend>
          <FieldGroup>
            <Field data-invalid={errors.name ? true : undefined}>
              <FieldLabel htmlFor={ids.name}>Nom</FieldLabel>
              <Input
                id={ids.name}
                value={name}
                autoComplete="off"
                maxLength={NAME_MAX_LENGTH}
                placeholder="Ex. Horizon et territoires…"
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? `${ids.name}-error` : undefined}
                onChange={(event) => setName(event.target.value)}
              />
              <FieldError id={`${ids.name}-error`}>{errors.name}</FieldError>
            </Field>
            <Field data-invalid={errors.abbreviation ? true : undefined} className="max-w-40">
              <FieldLabel htmlFor={ids.abbreviation}>Sigle</FieldLabel>
              <Input
                id={ids.abbreviation}
                value={abbreviation}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={ABBREVIATION_MAX_LENGTH}
                placeholder="Ex. HET…"
                aria-invalid={errors.abbreviation ? true : undefined}
                aria-describedby={errors.abbreviation ? `${ids.abbreviation}-error` : undefined}
                onChange={(event) => setAbbreviation(event.target.value)}
              />
              <FieldError id={`${ids.abbreviation}-error`}>{errors.abbreviation}</FieldError>
            </Field>
          </FieldGroup>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>Partis reliés</FieldLegend>
          <FieldDescription>Facultatif. Un groupe peut réunir les élus de plusieurs partis.</FieldDescription>
          {parties.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun parti pour l’instant.</p>
          ) : (
            <FieldGroup data-slot="checkbox-group" className="gap-3">
              {parties.map((party) => {
                const id = `${ids.parties}-${party.id}`;
                return (
                  <Field key={party.id} orientation="horizontal">
                    <Checkbox
                      id={id}
                      checked={partyIds.has(party.id)}
                      onCheckedChange={(checked) => toggleParty(party.id, checked)}
                    />
                    <FieldLabel htmlFor={id} className="font-normal">
                      <span>
                        {party.name} <span className="text-muted-foreground">· {party.abbreviation}</span>
                      </span>
                    </FieldLabel>
                  </Field>
                );
              })}
            </FieldGroup>
          )}
        </FieldSet>

        {errors.form && (
          <Alert variant="destructive">
            <AlertDescription>{errors.form}</AlertDescription>
          </Alert>
        )}

        {group && <Deletion group={group} onRemoved={onDone} />}
      </form>

      <SheetFooter className="flex-row justify-end border-t p-6">
        <SheetClose render={<Button variant="outline" />}>Annuler</SheetClose>
        <Button type="submit" form={formId} disabled={pending} focusableWhenDisabled>
          {pending && <Spinner data-icon="inline-start" />}
          {pending ? "Enregistrement…" : group ? "Enregistrer" : "Créer le groupe"}
        </Button>
      </SheetFooter>
    </>
  );
}

// Kept at the bottom of the sheet, away from the list: deleting is rare and cannot be undone.
function Deletion({ group, onRemoved }: { group: ParliamentaryGroup; onRemoved: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const remove = () => {
    setConfirming(false);
    startTransition(async () => {
      const result = await removeParliamentaryGroupAction(group.id);
      if (!result.ok) {
        toast.add({ title: result.message, type: "error" });
        return;
      }
      toast.add({ title: `Groupe « ${group.name} » supprimé`, type: "success" });
      onRemoved();
    });
  };

  return (
    <>
      <FieldSeparator />
      <FieldSet>
        <FieldLegend>Suppression</FieldLegend>
        <FieldDescription>La suppression est définitive.</FieldDescription>
        <div>
          <Button type="button" variant="destructive" disabled={pending} onClick={() => setConfirming(true)}>
            Supprimer le groupe
          </Button>
        </div>
      </FieldSet>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le groupe « {group.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le groupe disparaît du site et ses liens avec les partis sont retirés. Cette action est définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Supprimer le groupe
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Only what changed is sent, so a save never brings back a value another editor changed.
function changesFrom(
  group: ParliamentaryGroup,
  values: ParliamentaryGroupInput,
): z.input<typeof parliamentaryGroupChangesSchema> {
  const changes: ParliamentaryGroupChanges = {};
  if (values.name !== group.name) changes.name = values.name;
  if (values.abbreviation !== group.abbreviation) changes.abbreviation = values.abbreviation;
  const linked = new Set(group.parties.map((party) => party.id));
  const sameParties = values.partyIds.length === linked.size && values.partyIds.every((id) => linked.has(id));
  if (!sameParties) changes.partyIds = values.partyIds;
  return changes;
}

function serverErrors(message: string, group: ParliamentaryGroupChanges): Errors {
  if (message === groupNameTakenMessage(group)) return { name: message };
  if (message === groupAbbreviationTakenMessage(group)) return { abbreviation: message };
  return { form: message };
}
