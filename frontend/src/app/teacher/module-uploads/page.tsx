import { redirect } from "next/navigation";

// Preserve existing upload bookmarks while keeping one curriculum workspace.
export default async function ModuleUploadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of ["program", "subject"]) {
    const value = params[key];
    if (typeof value === "string") query.set(key, value);
  }
  redirect(`/teacher/lesson-content${query.size ? `?${query}` : ""}`);
}
