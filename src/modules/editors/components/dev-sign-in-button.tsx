import { Button } from "@/components/ui/button";

import { DEV_EDITOR_EMAIL } from "../dev-sign-in";

export function DevSignInButton() {
  return (
    <form action="/auth/dev-sign-in" method="post" className="flex flex-col gap-2 border-t pt-6">
      <p className="text-sm text-muted-foreground">
        En local uniquement : connexion immédiate avec l&apos;éditeur de test {DEV_EDITOR_EMAIL}.
      </p>
      <Button type="submit" variant="outline">
        Se connecter comme éditeur de test
      </Button>
    </form>
  );
}
