import { Button } from "@/components/ui/button";

import { signOut } from "../actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="sm">
        Se déconnecter
      </Button>
    </form>
  );
}
