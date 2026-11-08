import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { supabaseConfig } from "@/modules/editors/config";

import type { LogoType } from "./vocabulary";

// Declared, public and limited to 1 Mo in supabase/config.toml. Only this server writes to it,
// with the secret key; clients have no write access (ADR 0009).
const LOGO_BUCKET = "party-logos";

const extensions: Record<LogoType, string> = { "image/svg+xml": "svg", "image/png": "png", "image/webp": "webp" };

export function logoUrl(path: string): string {
  return `${supabaseConfig().url}/storage/v1/object/public/${LOGO_BUCKET}/${path}`;
}

// Each file gets a new name, so a replaced logo never stays in a browser or CDN cache.
export async function uploadLogo(bytes: Uint8Array, contentType: LogoType): Promise<string> {
  const path = `${randomUUID()}.${extensions[contentType]}`;
  const { error } = await logoBucket().upload(path, bytes, { contentType });
  if (error) throw error;
  return path;
}

// Called once the database no longer points at the file: a failure only leaves an unused file
// behind, so it is logged without failing a write that already succeeded.
export async function removeLogo(path: string): Promise<void> {
  try {
    const { error } = await logoBucket().remove([path]);
    if (error) throw error;
  } catch (error) {
    console.error(`Could not remove the party logo ${path}.`, error);
  }
}

function logoBucket() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new Error("SUPABASE_SECRET_KEY must be set to store party logos (ADR 0009).");
  const client = createClient(supabaseConfig().url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client.storage.from(LOGO_BUCKET);
}
