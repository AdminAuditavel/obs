import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { jsonResponse, errorResponse, z } from "../shared/_utils.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const schema = z.object({
    action: z.string().min(1),
    target_type: z.enum(['post', 'comment', 'user', 'report']),
    target_id: z.string().uuid(),
    reason: z.string().optional(),
    metadata: z.record(z.any()).optional()
});

serve(async (req: Request) => {
    try {
        if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

        const authHeader = req.headers.get("authorization") || "";
        const token = authHeader.replace(/^Bearer\s+/i, "");
        if (!token) return jsonResponse(401, { error: "Missing auth token" });

        // Authenticate the user
        const callerClient = createClient(SUPABASE_URL, token);
        const { data: userData, error: userErr } = await callerClient.auth.getUser();
        if (userErr || !userData?.user) return jsonResponse(401, { error: "Invalid token" });
        const callerUid = userData.user.id;

        // Check Moderator/Admin role
        const { data: up, error: upErr } = await adminClient
            .from("user_profiles")
            .select("role_id")
            .eq("auth_uid", callerUid)
            .maybeSingle();

        if (upErr) throw upErr;
        const role = (up as any)?.role_id;
        if (!['admin', 'moderator'].includes(role)) {
            return jsonResponse(403, { error: "Requires moderator or admin role" });
        }

        const body = await req.json();
        const payload = schema.parse(body);

        const { data: inserted, error } = await adminClient
            .from("moderation_actions")
            .insert([{
                moderator_auth_uid: callerUid,
                action: payload.action,
                target_type: payload.target_type,
                target_id: payload.target_id,
                reason: payload.reason,
                metadata: payload.metadata
            }])
            .select("*")
            .single();

        if (error) throw error;

        // Audit Log
        await adminClient.from("audit_logs").insert({
            actor_auth_uid: callerUid,
            action: `moderation:${payload.action}`,
            target_type: payload.target_type,
            target_id: payload.target_id,
            metadata: { reason: payload.reason, ...payload.metadata }
        });

        return jsonResponse(201, { moderation_action: inserted });
    } catch (err) {
        return errorResponse(err, "failed_moderation_action");
    }
});