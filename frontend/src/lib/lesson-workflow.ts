import type { MaterialItem } from "./document-processor-api";
import type { UserCategoryItem } from "./user-categories-api";
import type { SubjectRecord } from "./subjects-api";

export function programMatches(
  program: string | null | undefined,
  category: UserCategoryItem,
) {
  const normalize = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const value = normalize(program || "");
  if (!value) return false;
  const code = category.code.toUpperCase();
  if (code === "ELEMENTARY" && value.includes("elementary")) return true;
  if (
    code === "SECONDARY" &&
    (value.includes("secondary") || value.includes("juniorhigh"))
  )
    return true;
  if (code === "BLP" && value.includes("basicliteracy")) return true;
  const aliases: Record<string, string[]> = {
    ELEMENTARY: ["elementary", "elem", "ae elementary"],
    SECONDARY: [
      "secondary",
      "junior",
      "juniorhighschool",
      "jhs",
      "secondarylevel",
    ],
    BLP: ["blp", "basicliteracy", "basicliteracyprogram", "basic_literacy"],
  };
  return [
    category.code,
    category.name,
    ...(aliases[category.code.toUpperCase()] || []),
  ].some((alias) => normalize(alias) === value);
}

export function subjectsForProgram(
  subjects: SubjectRecord[],
  category: UserCategoryItem,
) {
  return subjects.filter(
    (subject) =>
      subject.is_active &&
      (subject.category_id === category.category_id ||
        subject.category_code?.toUpperCase() === category.code.toUpperCase()),
  );
}

export function materialInProgram(
  material: MaterialItem,
  category: UserCategoryItem,
) {
  // Program is authoritative. Shared subject names must never mix program dashboards.
  return programMatches(material.als_program, category);
}

export function lessonText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const value = node as { text?: string; content?: unknown[] };
  if (typeof value.text === "string") return value.text;
  return (value.content || []).map(lessonText).join(" ");
}

export function validateIlaFile(file: Pick<File, "name" | "size">) {
  if (!/\.(pdf|docx|png|jpe?g)$/i.test(file.name))
    return "Choose a PDF, DOCX, PNG, or JPG document.";
  if (!file.size || file.size > 50 * 1024 * 1024)
    return "Choose a non-empty document up to 50 MB.";
  return null;
}

export function flashcardHref(
  material: MaterialItem,
  program: string,
  subjectId?: string,
  lessonId?: string,
) {
  const query = new URLSearchParams({
    program,
    materialId: material.id,
    generate: "1",
  });
  if (subjectId) query.set("subject", subjectId);
  if (lessonId) query.set("lessonId", lessonId);
  return `/teacher/flashcards?${query}`;
}
