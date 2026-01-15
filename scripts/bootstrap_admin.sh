#!/bin/bash
# scripts/bootstrap_admin.sh
# Requer: jq, curl, psql (opcional)
set -e

# Variáveis esperadas no ambiente:
# SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME

echo "Bootstrapping Admin User..."

# 1) Criar usuário no Supabase Auth (admin) via Admin API
response=$(
  curl -s -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg email "$ADMIN_EMAIL" --arg pass "$ADMIN_PASSWORD" --arg name "$ADMIN_NAME" '{
      "email": $email,
      "password": $pass,
      "email_confirm": true,
      "user_metadata": { "full_name": $name }
    }')"
)

# echo "Create user response: $response"

# extrair id do usuário (auth_uid)
auth_uid=$(echo "$response" | jq -r '.id // empty')

if [ -z "$auth_uid" ] || [ "$auth_uid" == "null" ]; then
    # Tenta checar se falha foi porque usuario ja existe
    # infelizmente a API retorna erro body. Vamos assumir que se falhou, o usuário deve ser procurado ou operação falhou.
    echo "Falha ao criar usuário ou usuário já existe. Response: $response"
    echo "Tentando buscar usuário existente (hack básico se você tiver o access token, mas como é service role, vamos apenas avisar)."
    # Em produção, você faria um GET /users?query=...
    exit 1
fi

echo "Created/Found user with id: $auth_uid"

# 2) Inserir/atualizar user_profiles com role admin (usa psql ou supabase sql)
# SQL para rodar
sql_dml="
INSERT INTO public.user_profiles (auth_uid, full_name, role_id, consent_privacy, created_at, updated_at)
VALUES ('$auth_uid', '$ADMIN_NAME', 'admin', true, now(), now())
ON CONFLICT (auth_uid) DO UPDATE SET role_id = 'admin', full_name = EXCLUDED.full_name, updated_at = now();
"

echo "Executing SQL to seed profile..."

# Opção A: PG_CONN definida
if [ -n "${PG_CONN:-}" ]; then
  echo "$sql_dml" | psql "${PG_CONN}"
  echo "✅ user_profiles atualizado via psql."
else
  # Opção B: Imprimir para o usuário rodar
  echo "⚠️  PG_CONN não definido. Execute o SQL abaixo no Supabase SQL Editor:"
  echo "BEGIN;"
  echo "$sql_dml"
  echo "COMMIT;"
fi
