-- #196: papéis em users e tabela de convites; aditiva e reaplicável sobre o schema final.
-- Antes desta versão só existiam contas criadas pelo seed (administradores): elas viram role = 'admin'.
BEGIN;

DO $users_role_migration$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_attribute
        WHERE attrelid = to_regclass('public.users') AND NOT attisdropped AND attname = 'role') THEN
        ALTER TABLE users
            ADD COLUMN name text,
            ADD COLUMN role text NOT NULL DEFAULT 'usuario';
        UPDATE users SET name = 'Administrador', role = 'admin', updated_at = now();
        ALTER TABLE users
            ALTER COLUMN name SET NOT NULL,
            ADD CONSTRAINT users_name_valid CHECK (btrim(name) <> ''),
            ADD CONSTRAINT users_role_valid CHECK (role IN ('admin', 'usuario'));
    END IF;
END;
$users_role_migration$;

CREATE TABLE IF NOT EXISTS invitations (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email text NOT NULL,
    role text NOT NULL,
    token_hash text NOT NULL,
    invited_by bigint NOT NULL,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT invitations_email_format_valid CHECK (
        email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ),
    CONSTRAINT invitations_role_valid CHECK (role IN ('admin', 'usuario')),
    CONSTRAINT invitations_token_hash_unique UNIQUE (token_hash),
    CONSTRAINT invitations_token_hash_valid CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT invitations_expires_after_created CHECK (expires_at > created_at),
    CONSTRAINT invitations_used_after_created CHECK (used_at IS NULL OR used_at >= created_at),
    CONSTRAINT invitations_invited_by_fk FOREIGN KEY (invited_by)
        REFERENCES users (id) ON DELETE RESTRICT
);

COMMENT ON COLUMN users.name IS 'Nome exibido na aplicação; o administrador do seed é "Administrador".';
COMMENT ON COLUMN users.role IS 'Papel: admin altera a configuração e convida; usuario só consulta.';
COMMENT ON TABLE invitations IS 'Convites de cadastro emitidos por administradores; uso único e com validade.';
COMMENT ON COLUMN invitations.role IS 'Papel que a conta criada pelo convite recebe.';
COMMENT ON COLUMN invitations.token_hash IS 'SHA-256 (hex) do token do link; o token em si nunca é gravado.';
COMMENT ON COLUMN invitations.used_at IS 'Instante do cadastro; preenchido na mesma transação que cria a conta.';

COMMIT;
