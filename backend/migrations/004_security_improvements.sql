-- Migration: 004_security_improvements.sql
BEGIN;

-- 1. Melhorar SELECT em `posts`:
--    - Public: vê somente 'published'
--    - Privileged (Owner ou Admin/Mod): vê tudo (inclusive pending, removed)

-- Remove policy anterior permissiva "public_select" (SELECT true) se existir
DROP POLICY IF EXISTS public_select ON public.posts;
-- Remove policy "select_own_or_mod" caso tenhamos criado algo assim anteriormente (003 não criou select priv, só public_select)

-- A) Public Published Select
CREATE POLICY public_published_select ON public.posts
FOR SELECT USING (
  status = 'published'
);

-- B) Privileged Select (Owner OR Admin/Moderator)
CREATE POLICY privileged_select_all ON public.posts
FOR SELECT USING (
  -- Owner
  auth.uid() = author_auth_uid
  OR 
  -- Admin/Moderator
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.auth_uid = auth.uid() 
    AND up.role_id IN ('admin', 'moderator')
  )
);


-- 2. Restringir DELETE em `posts`:
--    - Apenas Admin pode deletar fisicamente.
--    - (Usuários normais devem usar UPDATE status='removed', que já cai na policy de update)

-- Remove policy de delete se existir (003 não criou explicitamente, default é deny, mas vamos garantir)
DROP POLICY IF EXISTS admin_delete_posts ON public.posts;

CREATE POLICY admin_delete_posts ON public.posts
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.auth_uid = auth.uid() 
    AND up.role_id = 'admin'
  )
);


-- 3. Refinar post_reports SELECT (já feito no 003, mas garantindo)
--    - 003 criou `select_mods_admins`. Vamos manter. 
--    - Se quiser adicionar "user vê seus próprios reports", podemos criar:
CREATE POLICY select_own_reports ON public.post_reports
FOR SELECT USING (
  reporter_auth_uid = auth.uid()
);


-- 4. Audit Log e Moderation Actions
--    - 003 bloqueou INSERT de client. Mantido.
--    - SELECT: Apenas mods/admin devem ver actions e audit?
--    Vamos criar policies de SELECT para admins/mods nessas tabelas (003 não criou select policies para elas, então default é deny select).

CREATE POLICY select_mods_admins_audit ON public.audit_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.auth_uid = auth.uid() 
    AND up.role_id IN ('admin', 'moderator')
  )
);

CREATE POLICY select_mods_admins_mod_actions ON public.moderation_actions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.auth_uid = auth.uid() 
    AND up.role_id IN ('admin', 'moderator')
  )
);


COMMIT;
