// Shared helpers for the Edge Functions (Deno)
// We import zod here to share it efficiently across functions (cached by Deno modules)
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
export { z };

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

// Standardized error handler to avoid leaking internal details
export function errorResponse(err: unknown, defaultMsg = "internal_error") {
    console.error(err);
    if (err instanceof z.ZodError) {
        return jsonResponse(400, { error: "validation_error", details: err.errors });
    }
    // Check for known Postgres errors if they bubble up mostly as objects
    const msg = String(err);
    if (msg.includes("invite_has_no_uses_left")) return jsonResponse(400, { error: "invite_no_uses_left" });
    if (msg.includes("invite_not_found")) return jsonResponse(400, { error: "invalid_token" });
    if (msg.includes("invite_expired")) return jsonResponse(400, { error: "invite_expired" });
    if (msg.includes("invite_revoked")) return jsonResponse(400, { error: "invite_revoked" });

    // Hide internal details for 500
    return jsonResponse(500, { error: defaultMsg });
}