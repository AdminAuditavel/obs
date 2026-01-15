import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function jsonResponse(status: number, payload: unknown) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, "content-type": "application/json" },
    });
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const schema = z.object({
    target_uid: z.string().uuid(),
    new_role: z.enum(["admin", "moderator", "contributor", "registered"])
});

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

        const authHeader = req.headers.get("authorization") || "";
        const token = authHeader.replace(/^Bearer\s+/i, "");
        if (!token) return jsonResponse(401, { error: "Missing auth token" });

        // Verify Caller is Admin
        const callerClient = createClient(
            SUPABASE_URL,
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: authHeader } } }
        );
        const { data: userData, error: userErr } = await callerClient.auth.getUser();
        if (userErr || !userData?.user) return jsonResponse(401, { error: "Invalid token" });
        const callerUid = userData.user.id;

        const { data: callerProfile, error: profileErr } = await adminClient
            .from("user_profiles")
            .select("role_id")
            .eq("auth_uid", callerUid)
            .single();

        if (profileErr || callerProfile.role_id !== "admin") {
            return jsonResponse(403, { error: "Access denied. Admins only." });
        }

        // Parse Body
        const body = await req.json();
        const payload = schema.parse(body);

        // Update Target User
        const { error: updateErr } = await adminClient
            .from("user_profiles")
            .update({ role_id: payload.new_role })
            .eq("auth_uid", payload.target_uid);

        if (updateErr) throw updateErr;

        // Audit Log
        await adminClient.from("audit_logs").insert({
            actor_auth_uid: callerUid,
            action: "user_role_updated",
            target_type: "user",
            target_id: payload.target_uid,
            metadata: { new_role: payload.new_role }
        });

        return jsonResponse(200, { success: true });

    } catch (err: any) {
        console.error(err);
        if (err instanceof z.ZodError) {
            return jsonResponse(400, { error: "validation_error", details: err.errors });
        }
        return jsonResponse(500, { error: err.message || "Internal server error" });
    }
});
