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

    // START DEBUGGING
    const debugMsg = typeof err === 'object' ? JSON.stringify(err) : String(err);
    return jsonResponse(500, { error: defaultMsg, details: debugMsg });
    // END DEBUGGING
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const schema = z.object({
    token: z.string().min(10),
    email: z.string().email().optional(), // Optional if logged in
    password: z.string().min(8).optional(), // Optional if logged in
    full_name: z.string().min(2).optional(),
    phone: z.string().optional()
});

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    let inviteData: any = null;

    try {
        if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

        const body = await req.json();
        const payload = schema.parse(body);
        const tokenHash = await sha256hex(payload.token);

        // Check if caller is authenticated (Upgrade flow)
        const authHeader = req.headers.get("authorization") || "";
        const authToken = authHeader.replace(/^Bearer\s+/i, "");
        let callerUid: string | null = null;
        let callerEmail: string | null = null;

        if (authToken) {
            const userClient = createClient(
                SUPABASE_URL,
                Deno.env.get("SUPABASE_ANON_KEY") ?? "",
                { global: { headers: { Authorization: authHeader } } }
            );
            const { data: { user }, error: userErr } = await userClient.auth.getUser();
            if (user && !userErr) {
                callerUid = user.id;
                callerEmail = user.email!;
            }
        }

        // Atomic check and claim using RPC
        const { data: rpcData, error: rpcErr } = await adminClient.rpc("claim_invite", {
            p_token_hash: tokenHash
        });

        if (rpcErr) {
            if (rpcErr.message.includes("exhausted") || rpcErr.message.includes("expired")) {
                return jsonResponse(400, { error: "Convite expirado ou esgotado." });
            }
            throw rpcErr;
        }

        inviteData = rpcData; // Assign to outer scope var

        let finalUid = callerUid;

        if (callerUid) {
            // UPGRADE FLOW
            await adminClient.from("user_profiles").update({
                role_id: inviteData.role_id
            }).eq("auth_uid", callerUid);

            // Audit
            await adminClient.from("audit_logs").insert({
                actor_auth_uid: callerUid,
                action: "invite_accepted_upgrade",
                target_type: "invite",
                target_id: inviteData.id,
                metadata: { role_assigned: inviteData.role_id }
            });

            return jsonResponse(200, { success: true, mode: 'upgrade', role: inviteData.role_id });

        } else {
            // NEW USER FLOW
            if (!payload.email || !payload.password) {
                return jsonResponse(400, { error: "Email and password required for new users" });
            }

            // Verify email match
            if (inviteData.invited_email && inviteData.invited_email.toLowerCase() !== payload.email.toLowerCase()) {
                return jsonResponse(403, { error: "Email does not match invite" });
            }

            const { data: userData, error: createErr } = await adminClient.auth.admin.createUser({
                email: payload.email,
                password: payload.password,
                email_confirm: true,
                user_metadata: { full_name: payload.full_name }
            });

            if (createErr) throw createErr;

            finalUid = userData.user.id;

            // Profile is created by trigger, so we update it
            const { error: profileErr } = await adminClient.from("user_profiles").update({
                full_name: payload.full_name || "User",
                role_id: inviteData.role_id,
                phone: payload.phone || null,
                avatar_url: null,
                consent_privacy: true
            }).eq("auth_uid", finalUid);

            if (profileErr) {
                console.error("Failed to update profile", profileErr);

                // ROLLBACK: Delete the user so they can try again cleanly
                await adminClient.auth.admin.deleteUser(finalUid);

                throw profileErr;
            }

            // Audit Log
            await adminClient.from("audit_logs").insert({
                actor_auth_uid: finalUid,
                action: "invite_accepted",
                target_type: "invite",
                target_id: inviteData.id,
                metadata: { role_assigned: inviteData.role_id }
            });

            return jsonResponse(201, { user: { id: finalUid, email: payload.email } });
        }

    } catch (err: any) {
        console.error("AcceptInvite Error:", err);

        // RESTORE INVITE: If we claimed the invite but failed to create the user/profile, restore the usage count
        // This must happen BEFORE any early returns
        if (inviteData && inviteData.id) {
            try {
                const { data: currentInv } = await adminClient.from('invites').select('uses_left').eq('id', inviteData.id).single();
                if (currentInv) {
                    await adminClient.from('invites').update({ uses_left: currentInv.uses_left + 1 }).eq('id', inviteData.id);
                    console.log("Restored invite usage for:", inviteData.id);
                }
            } catch (restoreErr) {
                console.error("Failed to restore invite usage:", restoreErr);
            }
        }

        // Extract meaningful message
        let msg = "";
        if (typeof err === 'string') msg = err;
        else if (err?.message) msg = err.message;
        else if (err?.details) msg = err.details;
        else msg = JSON.stringify(err);

        // Handle Postgres Unique Violation
        // Check both code and message text
        if (
            err?.code === '23505' ||
            msg.includes('duplicate key') ||
            msg.includes('violates unique constraint')
        ) {
            return jsonResponse(409, { error: "duplicate_entry", details: "Este e-mail ou telefone já está cadastrado." });
        }

        // Handle Auth User Exists
        if (
            msg.includes("already registered") ||
            msg.includes("User already exists") ||
            err?.status === 422
        ) {
            return jsonResponse(409, { error: "user_exists", details: "Usuário já possui conta. Faça login para aceitar." });
        }

        // Return details for debugging
        return errorResponse(err, "failed_accept_invite");
    }
});