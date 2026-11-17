import { queryOptions } from "@tanstack/react-query";

export type Profile = { id: string; companyName: string };

export const profileQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["profile", userId],
    queryFn: async (): Promise<Profile> => {
      const response = await fetch("/api/forge/profile", { credentials: "same-origin" });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result || typeof result.companyName !== "string") {
        throw new Error(result?.error || "Could not load your account profile.");
      }
      return { id: userId, companyName: result.companyName };
    },
  });

export async function saveCompanyName(companyName: string) {
  const response = await fetch("/api/forge/profile", {
    method: "PUT",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ companyName }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) throw new Error(result?.error || "Could not save your company name.");
  return result as Profile;
}
