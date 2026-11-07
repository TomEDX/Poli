"use client";

import { cn } from "cn";
import { Plus, Trash2 } from "lucide-react";
import { Fragment } from "react";

import { Button } from "@/components/ui/button";
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
import { iconButton, partyGrid } from "./row-layout";

export type PartyField = "name" | "abbreviation" | "candidateName";

type PartyRowProps = {
  party: Party;
  editing: PartyField | null;
  onEditingChange: (field: PartyField | null) => void;
  pending: boolean;
  error: string | null;
  onAction: (action: () => Promise<ActionResult>) => void;
};

export function PartyRow({ party, editing, onEditingChange, pending, error, onAction }: PartyRowProps) {
  const stopEditing = () => onEditingChange(null);
  const { candidacy } = party;

  return (
    <Fragment>
      <li className={cn(partyGrid, "border-t py-1.5")}>
        <div className="flex min-w-0 items-center">
          {editing === "name" ? (
            <InlineInput
              label={`Nom du parti « ${party.name} »`}
              initial={party.name}
              onClose={stopEditing}
              onSave={(name) => editPartyAction(party.id, { name })}
            />
          ) : (
            <EditableText
              label={`Renommer « ${party.name} »`}
              className="font-semibold"
              onEdit={() => onEditingChange("name")}
            >
              {party.name}
            </EditableText>
          )}
        </div>

        <div className="flex min-w-0 items-center">
          {editing === "abbreviation" ? (
            <InlineInput
              label={`Sigle de « ${party.name} »`}
              initial={party.abbreviation}
              maxLength={ABBREVIATION_MAX_LENGTH}
              onClose={stopEditing}
              onSave={(abbreviation) => editPartyAction(party.id, { abbreviation })}
            />
          ) : (
            <EditableText
              label={`Modifier le sigle de « ${party.name} »`}
              onEdit={() => onEditingChange("abbreviation")}
            >
              {party.abbreviation}
            </EditableText>
          )}
        </div>

        <div className="col-span-2 flex min-w-0 flex-col gap-0.5 md:col-span-1">
          {candidacy === null ? (
            <Button
              variant="ghost"
              size="xs"
              className="h-8 self-start text-muted-foreground md:h-6"
              disabled={pending}
              onClick={() => onAction(() => createCandidacyAction(party.id, { candidateName: "" }))}
            >
              <Plus /> Créer la candidature
            </Button>
          ) : (
            <>
              <div className="flex min-w-0 items-center gap-1">
                {editing === "candidateName" ? (
                  <InlineInput
                    label={`Candidat de « ${party.name} »`}
                    placeholder="Nom du candidat, vide si non déclaré"
                    initial={candidacy.candidateName ?? ""}
                    allowEmpty
                    onClose={stopEditing}
                    onSave={(candidateName) => editCandidacyAction(candidacy.id, { candidateName })}
                  />
                ) : (
                  <EditableText
                    label={`Modifier le candidat de « ${party.name} »`}
                    className={cn(candidacy.candidateName === null && "text-muted-foreground italic")}
                    onEdit={() => onEditingChange("candidateName")}
                  >
                    {candidacy.candidateName ?? "Candidat non déclaré"}
                  </EditableText>
                )}
                <StatusBadge published={candidacy.status === "published"} />
              </div>
              <div className="flex flex-wrap items-center gap-x-1">
                <p className="px-1 text-xs text-muted-foreground">Affichée « {candidacy.label} »</p>
                <Button
                  variant="ghost"
                  size="xs"
                  className="h-8 md:h-6"
                  disabled={pending}
                  onClick={() =>
                    onAction(() =>
                      setCandidacyStatusAction(candidacy.id, candidacy.status === "published" ? "draft" : "published"),
                    )
                  }
                >
                  {candidacy.status === "published" ? "Dépublier" : "Publier"}
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  className="h-8 text-muted-foreground hover:text-destructive md:h-6"
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm(`Supprimer la candidature « ${candidacy.label} » ?`)) {
                      onAction(() => removeCandidacyAction(candidacy.id));
                    }
                  }}
                >
                  Supprimer la candidature
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="col-start-2 row-start-1 flex justify-end md:col-start-4">
          <Button
            variant="ghost"
            size="icon-xs"
            className={cn(iconButton, "text-muted-foreground hover:text-destructive")}
            aria-label={`Supprimer le parti « ${party.name} »`}
            title="Supprimer le parti"
            disabled={pending}
            onClick={() => {
              if (window.confirm(`Supprimer le parti « ${party.name} » ?`)) onAction(() => removePartyAction(party.id));
            }}
          >
            <Trash2 />
          </Button>
        </div>
      </li>
      {error && (
        <li className="px-3 pb-2">
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        </li>
      )}
    </Fragment>
  );
}

function StatusBadge({ published }: { published: boolean }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-md px-1.5 text-xs",
        published ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
      )}
    >
      {published ? "Publiée" : "Brouillon"}
    </span>
  );
}
