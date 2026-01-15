import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export async function sha256hex(input: string): Promise<string> {
    const enc = new TextEncoder();
    const data = enc.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

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

export function errorResponse(err: unknown, defaultMsg = "internal_error") {
    console.error(err);
    if (err instanceof z.ZodError) {
        return jsonResponse(400, { error: "validation_error", details: err.errors });
    }
    const msg = String(err);
    if (msg.includes("invite_has_no_uses_left")) return jsonResponse(400, { error: "invite_no_uses_left" });
    if (msg.includes("invite_not_found")) return jsonResponse(400, { error: "invalid_token" });
    if (msg.includes("invite_expired")) return jsonResponse(400, { error: "invite_expired" });
    if (msg.includes("invite_revoked")) return jsonResponse(400, { error: "invite_revoked" });

    return jsonResponse(500, { error: defaultMsg });
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const schema = z.object({
    invited_email: z.string().email().optional(),
    invited_phone: z.string().optional(),
    role_id: z.enum(["admin", "moderator", "contributor", "registered"]).default("registered"),
    max_uses: z.number().int().min(1).default(1),
    expires_in_seconds: z.number().int().min(60).default(60 * 60 * 24 * 7)
}).refine(data => data.invited_email || data.invited_phone, {
    message: "Either invited_email or invited_phone must be provided",
    path: ["invited_email", "invited_phone"]
});

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

        const authHeader = req.headers.get("authorization") || "";
        const token = authHeader.replace(/^Bearer\s+/i, "");
        if (!token) return jsonResponse(401, { error: "Missing auth token" });

        const callerClient = createClient(
            SUPABASE_URL,
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: authHeader } } }
        );
        const { data: userData, error: userErr } = await callerClient.auth.getUser();
        if (userErr || !userData?.user) return jsonResponse(401, { error: "Invalid token" });
        const callerUid = userData.user.id;

        // Check admin role
        const { data: up, error: upErr } = await adminClient
            .from("user_profiles")
            .select("role_id")
            .eq("auth_uid", callerUid)
            .maybeSingle();

        if (upErr) throw upErr;
        const role = (up as any)?.role_id;
        if (role !== "admin") return jsonResponse(403, { error: "Requires admin role" });

        const body = await req.json();
        const payload = schema.parse(body);

        // 1. Check if user is ALREADY REGISTERED (Profile exists)
        let profileQuery = adminClient.from("user_profiles").select("id");
        if (payload.invited_email) {
            profileQuery = profileQuery.eq("email", payload.invited_email);
        } else if (payload.invited_phone) {
            profileQuery = profileQuery.eq("phone", payload.invited_phone);
        }

        const { data: existingUser, error: profCheckErr } = await profileQuery.maybeSingle();
        if (profCheckErr) throw profCheckErr;

        if (existingUser) {
            return jsonResponse(409, { error: "Este usuário já está cadastrado no sistema." });
        }

        // 2. Check for existing active invite
        let query = adminClient.from("invites")
            .select("id")
            .eq("revoked", false)
            .gt("uses_left", 0)
            .gt("expires_at", new Date().toISOString());

        if (payload.invited_email) {
            query = query.ilike("invited_email", payload.invited_email);
        } else if (payload.invited_phone) {
            query = query.eq("invited_phone", payload.invited_phone);
        }

        const { data: existing, error: checkErr } = await query.maybeSingle();
        if (checkErr) throw checkErr;

        if (existing) {
            return jsonResponse(409, { error: "Já existe um convite ativo para este contato." });
        }

        const rawToken = crypto.randomUUID() + "-" + Math.random().toString(36).slice(2, 8);
        const tokenHash = await sha256hex(rawToken);

        const expires_at = new Date(Date.now() + payload.expires_in_seconds * 1000).toISOString();

        const { data: inserted, error: insertErr } = await adminClient
            .from("invites")
            .insert([{
                invited_email: payload.invited_email || null,
                invited_phone: payload.invited_phone || null,
                role_id: payload.role_id,
                inviter_auth_uid: callerUid,
                token_hash: tokenHash,
                token: rawToken, // Store plain token (feature request)
                max_uses: payload.max_uses,
                uses_left: payload.max_uses,
                expires_at,
                revoked: false
            }])
            .select("*")
            .single();

        if (insertErr) throw insertErr;

        // Audit Log
        await adminClient.from("audit_logs").insert({
            actor_auth_uid: callerUid,
            action: "invite_created",
            target_type: "invite",
            target_id: inserted.id,
            metadata: { invited_email: payload.invited_email, invited_phone: payload.invited_phone, role_id: payload.role_id }
        });

        return jsonResponse(201, {
            invite: {
                id: inserted.id,
                invited_email: inserted.invited_email,
                invited_phone: inserted.invited_phone,
                role_id: inserted.role_id,
                expires_at: inserted.expires_at
            },
            token: rawToken
        });
    } catch (err) {
        return errorResponse(err, "failed_generate_invite");
    }
});