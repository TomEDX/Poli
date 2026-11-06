import { vi } from "vitest";

// revalidatePath only works inside a Next.js request; tests check which paths were asked for.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
