"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import type { DeleteState } from "../actions";

const initialState: DeleteState = { status: "idle" };

type DeleteButtonProps = {
  action: (state: DeleteState, formData: FormData) => Promise<DeleteState>;
  id: string;
  label: string;
  confirmation: string;
};

export function DeleteButton({ action, id, label, confirmation }: DeleteButtonProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(confirmation)) event.preventDefault();
      }}
      className="contents"
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="destructive" size="icon-sm" aria-label={label} title={label} disabled={pending}>
        <Trash2 />
      </Button>
      {state.status === "error" && (
        <p role="alert" className="basis-full text-sm text-destructive">
          {state.message}
        </p>
      )}
    </form>
  );
}
