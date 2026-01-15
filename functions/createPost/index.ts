import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { jsonResponse, errorResponse, z } from "../shared/_utils.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Use service role if we want to log audits, but for insert usually user client is fine.
// The code used userClient, let's stick to it, but maybe validation helps prevent bad data.

const schema = z.object({
    airport_id: z.string().uuid().optional().nullable(),
    area: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    geolocation: z.any().optional().nullable(), // difficult to validate strict GeoJSON simple without lib, allowing any for now but could tighten
    status: z.enum(['draft', 'published', 'archived']).default('draft').optional()
});

serve(async (req: Request) => {
    try {
        if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

        const authHeader = req.headers.get("authorization") || "";
        const token = authHeader.replace(/^Bearer\s+/i, "");
        if (!token) return jsonResponse(401, { error: "Missing auth token" });

        const userClient = createClient(SUPABASE_URL, token);

        const { data: userData, error: userErr } = await userClient.auth.getUser();
        if (userErr || !userData?.user) return jsonResponse(401, { error: "Invalid token" });

        const uid = userData.user.id;

        const body = await req.json();
        const payload = schema.parse(body);

        const toInsert = {
            author_auth_uid: uid,
            airport_id: payload.airport_id ?? null,
            area: payload.area ?? null,
            category: payload.category ?? null,
            description: payload.description ?? null,
            geolocation: payload.geolocation ?? null,
            server_timestamp: new Date().toISOString(),
            status: payload.status ?? "draft"
        };

        // Insert using the user's client so RLS enforces owner-based rules
        const { data: inserted, error: insertErr } = await userClient
            .from("posts")
            .insert([toInsert])
            .select("*")
            .single();

        if (insertErr) throw insertErr;

        return jsonResponse(201, { post: inserted });
    } catch (err) {
        return errorResponse(err, "failed_create_post");
    }
});