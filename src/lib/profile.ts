import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type Profile = { id: string; display_name: string; company_name: string };

export const profileQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["profile", userId],
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!data.user || data.user.id !== userId) {
        return { id: userId, display_name: "", company_name: "" };
      }
      const metadata = data.user.user_metadata ?? {};
      return {
        id: userId,
        display_name: typeof metadata.display_name === "string" ? metadata.display_name : "",
        company_name: typeof metadata.company_name === "string" ? metadata.company_name : "",
      };
    },
  });
