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
import {
  Field,
  FieldContent,
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
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import type { ActionResult } from "@/modules/editors/editor-write";

import { createPartyAction, removeCandidacyAction, removePartyAction, savePartyAction } from "../actions";
import {
  abbreviationTakenMessage,
  candidacyLabel,
  logoSizeMessage,
  logoTypeMessage,
  partyNameTakenMessage,
} from "../vocabulary";
import type { Party, PartyChanges } from "../queries";
import type { PublicationStatus } from "../../publication-status";
import { ABBREVIATION_MAX_LENGTH, NAME_MAX_LENGTH } from "../../form-fields";
import { newPartySchema, type partyEditSchema } from "../validation";
import { type LogoChoice, LogoField } from "./logo-field";

type PartySheetProps = {
  // null to create a new party.
  party: Party | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Where the focus goes once the sheet closes: the row or button that opened it.
  returnFocus: () => HTMLElement | null;
  // Called with true just before the party is deleted, and with false if the deletion fails.
  onRemovingParty: (removing: boolean) => void;
};

export function PartySheet({ party, open, onOpenChange, returnFocus, onRemovingParty }: PartySheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 data-[side=right]:w-full sm:max-w-md" finalFocus={() => returnFocus() ?? true}>
        <SheetHeader className="border-b p-6">
          <SheetTitle>{party ? party.name : "Nouveau parti"}</SheetTitle>
          <SheetDescription>
            {party ? "Modifiez le parti et sa candidature." : "Créez le parti et, s’il en présente une, sa candidature."}
          </SheetDescription>
        </SheetHeader>
        {/* Keyed by party so the fields start again from the party shown. */}
        <PartyForm
          key={party?.id ?? "new"}
          party={party}
          onDone={() => onOpenChange(false)}
          onRemovingParty={onRemovingParty}
        />
      </SheetContent>
    </Sheet>
  );
}

type Errors = { name?: string; abbreviation?: string; logo?: string; candidateName?: string; form?: string };


type PartyFormProps = {
  party: Party | null;
  onDone: () => void;
  onRemovingParty: (removing: boolean) => void;
};

function PartyForm({ party, onDone, onRemovingParty }: PartyFormProps) {
  const candidacy = party?.candidacy ?? null;
  const [name, setName] = useState(party?.name ?? "");
  const [abbreviation, setAbbreviation] = useState(party?.abbreviation ?? "");
  // A new party usually comes with its candidacy; an existing one without keeps none until asked.
  const [wantsCandidacy, setWantsCandidacy] = useState(party === null);
  const [candidateName, setCandidateName] = useState(candidacy?.candidateName ?? "");
  const [published, setPublished] = useState(candidacy?.status === "published");
  const [logo, setLogo] = useState<LogoChoice>(undefined);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();
  const formId = useId();
  const ids = {
    name: useId(),
    abbreviation: useId(),
    logo: useId(),
    wants: useId(),
    candidate: useId(),
    published: useId(),
  };

  const hasCandidacy = candidacy !== null || wantsCandidacy;
  // Shown once the party has a name and an abbreviation to build the public label from.
  const preview =
    name.trim() && abbreviation.trim()
      ? candidacyLabel({ candidateName: candidateName.trim() || null, party: { name: name.trim(), abbreviation: abbreviation.trim() } })
      : null;

  const show = (next: Errors) => {
    setErrors(next);
    const first = (["name", "abbreviation", "logo", "candidateName"] as const).find((field) => next[field]);
    if (first) document.getElementById(ids[first === "candidateName" ? "candidate" : first])?.focus();
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const status = published ? "published" : "draft";
    const parsed = newPartySchema.safeParse({
      name,
      abbreviation,
      candidacy: hasCandidacy ? { candidateName, status } : null,
      logo: logo?.file,
    });
    if (!parsed.success) {
      const message = (field: string) => parsed.error.issues.find((issue) => issue.path.at(-1) === field)?.message;
      return show({
        name: message("name"),
        abbreviation: message("abbreviation"),
        logo: message("logo"),
        candidateName: message("candidateName"),
      });
    }
    const values = parsed.data;

    startTransition(async () => {
      const edit = party ? changesFrom(party, values, logo === null) : null;
      if (edit && Object.keys(edit).length === 0) return onDone();
      const result = edit && party ? await savePartyAction(party.id, edit) : await createPartyAction(values);
      if (!result.ok) return show(serverErrors(result.message, values));
      toast.add({ title: party ? "Modifications enregistrées" : `Parti « ${values.name} » créé`, type: "success" });
      onDone();
    });
  };

  return (
    <>
      <form id={formId} noValidate onSubmit={submit} className="flex flex-1 flex-col gap-8 overflow-y-auto p-6">
        <FieldSet>
          <FieldLegend>Parti</FieldLegend>
          <FieldGroup>
            <Field data-invalid={errors.name ? true : undefined}>
              <FieldLabel htmlFor={ids.name}>Nom</FieldLabel>
              <Input
                id={ids.name}
                value={name}
                autoComplete="off"
                maxLength={NAME_MAX_LENGTH}
                placeholder="Ex. Parti de l’Horizon…"
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
                placeholder="Ex. PDH…"
                aria-invalid={errors.abbreviation ? true : undefined}
                aria-describedby={errors.abbreviation ? `${ids.abbreviation}-error` : undefined}
                onChange={(event) => setAbbreviation(event.target.value)}
              />
              <FieldError id={`${ids.abbreviation}-error`}>{errors.abbreviation}</FieldError>
            </Field>
            <LogoField
              id={ids.logo}
              value={logo}
              savedLogo={party?.logo ?? null}
              party={{ name: name.trim() || "Nouveau parti", abbreviation: abbreviation.trim() }}
              error={errors.logo}
              onChange={setLogo}
              onError={(message) => setErrors((current) => ({ ...current, logo: message }))}
            />
          </FieldGroup>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>Candidature</FieldLegend>
          <FieldGroup>
            {candidacy === null && (
              <Field orientation="horizontal">
                <FieldLabel htmlFor={ids.wants}>Le parti présente une candidature</FieldLabel>
                <Switch id={ids.wants} checked={wantsCandidacy} onCheckedChange={setWantsCandidacy} />
              </Field>
            )}
            {hasCandidacy && (
              <>
                <Field data-invalid={errors.candidateName ? true : undefined}>
                  <FieldLabel htmlFor={ids.candidate}>Candidat</FieldLabel>
                  <Input
                    id={ids.candidate}
                    value={candidateName}
                    autoComplete="off"
                    maxLength={NAME_MAX_LENGTH}
                    placeholder="Ex. Camille Martin…"
                    aria-invalid={errors.candidateName ? true : undefined}
                    aria-describedby={`${ids.candidate}-help${errors.candidateName ? ` ${ids.candidate}-error` : ""}`}
                    onChange={(event) => setCandidateName(event.target.value)}
                  />
                  <FieldDescription id={`${ids.candidate}-help`}>
                    Laissez vide tant qu’aucun candidat n’est déclaré.
                  </FieldDescription>
                  <FieldError id={`${ids.candidate}-error`}>{errors.candidateName}</FieldError>
                </Field>
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor={ids.published}>En ligne</FieldLabel>
                    <FieldDescription>
                      {preview === null
                        ? "Visible sur le site public."
                        : `${published ? "Affichée sur le site" : "Une fois en ligne, affichée"} sous le nom «\u00a0${preview}\u00a0».`}
                    </FieldDescription>
                  </FieldContent>
                  <Switch id={ids.published} checked={published} onCheckedChange={setPublished} />
                </Field>
              </>
            )}
          </FieldGroup>
        </FieldSet>

        {errors.form && (
          <Alert variant="destructive">
            <AlertDescription>{errors.form}</AlertDescription>
          </Alert>
        )}

        {party && (
          <Deletion
            party={party}
            onCandidacyRemoved={() => setWantsCandidacy(false)}
            onPartyRemoved={onDone}
            onRemovingParty={onRemovingParty}
          />
        )}
      </form>

      <SheetFooter className="flex-row justify-end border-t p-6">
        <SheetClose render={<Button variant="outline" />}>Annuler</SheetClose>
        <Button type="submit" form={formId} disabled={pending} focusableWhenDisabled>
          {pending && <Spinner data-icon="inline-start" />}
          {pending ? "Enregistrement…" : party ? "Enregistrer" : "Créer le parti"}
        </Button>
      </SheetFooter>
    </>
  );
}

type DeletionProps = {
  party: Party;
  onCandidacyRemoved: () => void;
  onPartyRemoved: () => void;
  onRemovingParty: (removing: boolean) => void;
};

// Kept at the bottom of the sheet, away from the list: deleting is rare and cannot be undone.
function Deletion({ party, onCandidacyRemoved, onPartyRemoved, onRemovingParty }: DeletionProps) {
  const { candidacy } = party;
  const [confirm, setConfirm] = useState<{ open: boolean; target: "party" | "candidacy" }>({
    open: false,
    target: "candidacy",
  });
  const [pending, startTransition] = useTransition();

  const remove = () => {
    setConfirm((current) => ({ ...current, open: false }));
    startTransition(async () => {
      if (confirm.target === "candidacy" && candidacy) {
        const result = await removeCandidacyAction(candidacy.id);
        notify(result, "Candidature supprimée");
        if (result.ok) onCandidacyRemoved();
        return;
      }
      onRemovingParty(true);
      const result = await removePartyAction(party.id);
      notify(result, `Parti « ${party.name} » supprimé`);
      if (result.ok) onPartyRemoved();
      else onRemovingParty(false);
    });
  };

  return (
    <>
      <FieldSeparator />
      <FieldSet>
        <FieldLegend>Suppression</FieldLegend>
        <FieldDescription>
          {candidacy
            ? "Pour supprimer le parti, supprimez d’abord sa candidature."
            : "La suppression est définitive."}
        </FieldDescription>
        <div className="flex flex-wrap gap-2">
          {candidacy && (
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              focusableWhenDisabled
              onClick={() => setConfirm({ open: true, target: "candidacy" })}
            >
              Supprimer la candidature
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            disabled={pending || candidacy !== null}
            onClick={() => setConfirm({ open: true, target: "party" })}
          >
            Supprimer le parti
          </Button>
        </div>
      </FieldSet>

      <AlertDialog open={confirm.open} onOpenChange={(open) => setConfirm((current) => ({ ...current, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm.target === "party"
                ? `Supprimer le parti « ${party.name} » ?`
                : `Supprimer la candidature « ${candidacy?.label} » ?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm.target === "party"
                ? "Le parti est retiré de l’administration. Cette action est définitive."
                : "La candidature et les extraits de son programme disparaissent du site ; le parti est conservé. Cette action est définitive."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              {confirm.target === "party" ? "Supprimer le parti" : "Supprimer la candidature"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

type FormValues = {
  name: string;
  abbreviation: string;
  candidacy: { candidateName: string | null; status: PublicationStatus } | null;
  logo?: File;
};

// Only what changed is sent, so a save never brings back a value another editor changed.
// The server writes it all in one transaction: a refused change leaves everything as it was.
function changesFrom(party: Party, values: FormValues, removesLogo: boolean): z.input<typeof partyEditSchema> {
  const edit: z.input<typeof partyEditSchema> = {};
  const changes: PartyChanges = {};
  if (values.name !== party.name) changes.name = values.name;
  if (values.abbreviation !== party.abbreviation) changes.abbreviation = values.abbreviation;
  if (Object.keys(changes).length > 0) edit.party = changes;
  if (values.logo) edit.logo = values.logo;
  else if (removesLogo) edit.logo = null;

  const wanted = values.candidacy;
  const current = party.candidacy;
  if (wanted && current) {
    const candidacy: { candidateName?: string; status?: PublicationStatus } = {};
    if (wanted.candidateName !== current.candidateName) candidacy.candidateName = wanted.candidateName ?? "";
    if (wanted.status !== current.status) candidacy.status = wanted.status;
    if (Object.keys(candidacy).length > 0) edit.candidacy = candidacy;
  } else if (wanted) {
    edit.newCandidacy = { candidateName: wanted.candidateName ?? "", status: wanted.status };
  }
  return edit;
}

function serverErrors(message: string, party: PartyChanges): Errors {
  if (message === partyNameTakenMessage(party)) return { name: message };
  if (message === abbreviationTakenMessage(party)) return { abbreviation: message };
  if (message === logoTypeMessage || message === logoSizeMessage) return { logo: message };
  return { form: message };
}

function notify(result: ActionResult, success: string) {
  toast.add(result.ok ? { title: success, type: "success" } : { title: result.message, type: "error" });
}
