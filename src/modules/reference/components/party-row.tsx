"use client";

import { cn } from "cn";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { Fragment, useRef, useState, useTransition } from "react";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { TableCell, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import type { ActionResult } from "@/modules/editors/editor-write";

import {
  createCandidacyAction,
  editCandidacyAction,
  editPartyAction,
  removeCandidacyAction,
  removePartyAction,
  setCandidacyStatusAction,
} from "../actions";
import type { Party } from "../parties";
import { ABBREVIATION_MAX_LENGTH } from "../validation";
import { EditableText } from "./editable-text";
import { InlineInput } from "./inline-input";

type PartyRowProps = {
  party: Party;
  nameRef: React.Ref<HTMLButtonElement>;
  // Called with true just before the party is deleted, and with false if the deletion fails.
  onRemovingParty: (removing: boolean) => void;
};

type PartyField = "name" | "abbreviation" | "candidateName";

// The write running on the row, so that the button that started it shows the wait.
type Running = "create" | "status" | "remove";

type Deletion = "party" | "candidacy";

export function PartyRow({ party, nameRef, onRemovingParty }: PartyRowProps) {
  const { candidacy } = party;
  const [editing, setEditing] = useState<PartyField | null>(null);
  const [refocus, setRefocus] = useState<PartyField | null>(null);
  // The dialog keeps its last deletion while it closes, so its text does not change mid-animation.
  const [confirm, setConfirm] = useState<{ open: boolean; deletion: Deletion }>({ open: false, deletion: "party" });
  const [running, setRunning] = useState<Running | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const menuTrigger = useRef<HTMLButtonElement>(null);

  const run = (kind: Running, action: () => Promise<ActionResult>, success: string, onDone?: (ok: boolean) => void) => {
    setRunning(kind);
    startTransition(async () => {
      const result = await action();
      setRunning(null);
      setError(result.ok ? null : result.message);
      if (result.ok) toast.add({ title: success, type: "success" });
      onDone?.(result.ok);
    });
  };

  const edit = (field: PartyField) => {
    setRefocus(null);
    setEditing(field);
  };
  const stopEditing = (field: PartyField) => (restoreFocus: boolean) => {
    setEditing(null);
    setRefocus(restoreFocus ? field : null);
  };
  const save = (write: (value: string) => Promise<ActionResult>, success: string) => async (value: string) => {
    const result = await write(value);
    if (result.ok) toast.add({ title: success, type: "success" });
    return result;
  };

  const createCandidacy = () =>
    run("create", () => createCandidacyAction(party.id, { candidateName: "" }), "Candidature créée en brouillon", (ok) => {
      if (ok) edit("candidateName");
    });

  const confirmDeletion = () => {
    setConfirm((current) => ({ ...current, open: false }));
    if (confirm.deletion === "party") {
      onRemovingParty(true);
      run("remove", () => removePartyAction(party.id), `Parti « ${party.name} » supprimé`, (ok) => {
        if (!ok) onRemovingParty(false);
      });
    } else if (candidacy) {
      run("remove", () => removeCandidacyAction(candidacy.id), "Candidature supprimée");
    }
  };

  return (
    <Fragment>
      <TableRow className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 py-1 md:table-row md:py-0">
        <TableCell className="min-w-0 whitespace-normal md:w-[28%]">
          {editing === "name" ? (
            <InlineInput
              label={`Nom du parti « ${party.name} »`}
              initial={party.name}
              onClose={stopEditing("name")}
              onSave={save((name) => editPartyAction(party.id, { name }), "Nom du parti enregistré")}
            />
          ) : (
            <EditableText
              ref={nameRef}
              label={`Modifier le nom du parti « ${party.name} »`}
              className="font-semibold"
              autoFocus={refocus === "name"}
              onEdit={() => edit("name")}
            >
              {party.name}
            </EditableText>
          )}
        </TableCell>

        <TableCell className="row-start-2 min-w-0 py-0 whitespace-normal md:w-28 md:py-2">
          <div className="flex min-w-0 items-center gap-1">
            <span className="pl-1 text-xs text-muted-foreground md:hidden">Sigle</span>
            {editing === "abbreviation" ? (
              <InlineInput
                label={`Sigle de « ${party.name} »`}
                initial={party.abbreviation}
                maxLength={ABBREVIATION_MAX_LENGTH}
                onClose={stopEditing("abbreviation")}
                onSave={save((abbreviation) => editPartyAction(party.id, { abbreviation }), "Sigle enregistré")}
              />
            ) : (
              <EditableText
                label={`Modifier le sigle de « ${party.name} »`}
                autoFocus={refocus === "abbreviation"}
                onEdit={() => edit("abbreviation")}
              >
                {party.abbreviation}
              </EditableText>
            )}
          </div>
        </TableCell>

        <TableCell className="col-span-2 row-start-3 min-w-0 whitespace-normal">
          {candidacy === null ? (
            <Button variant="outline" size="sm" disabled={pending} focusableWhenDisabled onClick={createCandidacy}>
              {running === "create" ? <Spinner data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
              Créer la candidature
            </Button>
          ) : (
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                {editing === "candidateName" ? (
                  <InlineInput
                    label={`Candidat de « ${party.name} »`}
                    placeholder="Nom du candidat, vide si non déclaré…"
                    initial={candidacy.candidateName ?? ""}
                    allowEmpty
                    onClose={stopEditing("candidateName")}
                    onSave={save(
                      (candidateName) => editCandidacyAction(candidacy.id, { candidateName }),
                      "Candidat enregistré",
                    )}
                  />
                ) : (
                  <EditableText
                    label={`Modifier le candidat de « ${party.name} »`}
                    className={cn(candidacy.candidateName === null && "text-muted-foreground italic")}
                    autoFocus={refocus === "candidateName"}
                    onEdit={() => edit("candidateName")}
                  >
                    {candidacy.candidateName ?? "Candidat non déclaré"}
                  </EditableText>
                )}
                <Badge variant={candidacy.status === "published" ? "default" : "secondary"}>
                  {candidacy.status === "published" ? "Publiée" : "Brouillon"}
                </Badge>
              </div>
              <p className="px-1 text-xs text-muted-foreground">
                {`${candidacy.status === "published" ? "Libellé public" : "Libellé public une fois publiée"}\u00a0: «\u00a0${candidacy.label}\u00a0»`}
              </p>
            </div>
          )}
        </TableCell>

        <TableCell className="col-start-2 row-start-1 md:w-px">
          <div className="flex items-center justify-end gap-1">
            {candidacy && (
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                focusableWhenDisabled
                onClick={() =>
                  candidacy.status === "published"
                    ? run("status", () => setCandidacyStatusAction(candidacy.id, "draft"), "Candidature dépubliée")
                    : run("status", () => setCandidacyStatusAction(candidacy.id, "published"), "Candidature publiée")
                }
              >
                {running === "status" && <Spinner data-icon="inline-start" />}
                {candidacy.status === "published" ? "Dépublier" : "Publier"}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    ref={menuTrigger}
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Autres actions pour « ${party.name} »`}
                  />
                }
              >
                {running === "remove" ? <Spinner /> : <MoreHorizontal />}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuGroup>
                  {candidacy && (
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={pending}
                      onClick={() => setConfirm({ open: true, deletion: "candidacy" })}
                    >
                      <Trash2 />
                      Supprimer la candidature
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={pending || candidacy !== null}
                    onClick={() => setConfirm({ open: true, deletion: "party" })}
                  >
                    <Trash2 />
                    Supprimer le parti
                  </DropdownMenuItem>
                  {candidacy && (
                    <DropdownMenuLabel className="font-normal text-muted-foreground">
                      Pour supprimer le parti, supprimez d’abord sa candidature.
                    </DropdownMenuLabel>
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>

      {error && (
        <TableRow className="block hover:bg-transparent md:table-row">
          <TableCell colSpan={4} className="block whitespace-normal md:table-cell">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </TableCell>
        </TableRow>
      )}

      <AlertDialog open={confirm.open} onOpenChange={(open) => setConfirm((current) => ({ ...current, open }))}>
        <AlertDialogContent finalFocus={menuTrigger}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm.deletion === "party"
                ? `Supprimer le parti « ${party.name} » ?`
                : `Supprimer la candidature « ${candidacy?.label} » ?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm.deletion === "party"
                ? "Le parti est retiré de l’administration. Cette action est définitive."
                : "La candidature disparaît du site public si elle était publiée ; le parti est conservé. Cette action est définitive."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDeletion}>
              {confirm.deletion === "party" ? "Supprimer le parti" : "Supprimer la candidature"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Fragment>
  );
}
