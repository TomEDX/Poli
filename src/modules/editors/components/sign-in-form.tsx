"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { type SignInState, sendMagicLink } from "../actions";

const initialState: SignInState = { status: "idle" };

export function SignInForm() {
  const [state, formAction, pending] = useActionState(sendMagicLink, initialState);

  if (state.status === "sent") {
    return (
      <p role="status" className="text-sm">
        Si <strong>{state.email}</strong> est l&apos;adresse d&apos;un éditeur, un lien de connexion
        vient d&apos;y être envoyé. Il est valable une heure et ne sert qu&apos;une fois.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Label htmlFor="email">Adresse e-mail</Label>
      <Input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        aria-invalid={state.status === "error"}
        aria-describedby={state.status === "error" ? "sign-in-error" : undefined}
      />
      {state.status === "error" && (
        <p id="sign-in-error" role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Envoi…" : "Recevoir un lien de connexion"}
      </Button>
    </form>
  );
}
