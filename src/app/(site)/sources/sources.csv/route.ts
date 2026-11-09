import { sourcesCsv } from "@/modules/reference/sources/csv";
import { getSources } from "@/modules/reference/sources/queries";

export async function GET() {
  return new Response(await sourcesFile(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sources-poli.csv"',
    },
  });
}

// Cached like the Sources page, and regenerated with it after each editor write.
async function sourcesFile() {
  "use cache";
  return sourcesCsv(await getSources());
}
