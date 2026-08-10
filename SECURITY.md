# Registro de Riesgos de Seguridad — Aceptación Documentada

Este documento registra los hallazgos de seguridad de Supabase Database Linter
(`security`) que se aceptan **conscientemente**, junto con la mitigación ya
aplicada, el riesgo residual, la decisión y el plan de salida.

Convención:

- **Mitigación aplicada**: controles ya activos que reducen el riesgo real.
- **Riesgo residual**: impacto que queda asumiendo la aceptación.
- **Plan de salida**: trabajo que eliminaría el hallazgo (se sigue por separado).

## Riesgos aceptados

| Finding | Expuesto a | Mitigación aplicada | Riesgo residual | Plan de salida |
|---|---|---|---|---|
| `is_pemtree_admin(p_user_id uuid)` — SECURITY DEFINER | anon + authenticated | Obligatoria por RLS (lee `user_roles`, protegida por RLS). `SET search_path TO ''`. Solo devuelve boolean; no lee ni modifica datos. La app no la llama por RPC. | **Bajo**: oráculo booleano de quién es admin/mod. | Mover a schema privado `_roles` (fuera de PostgREST) |
| `is_pemtree_moderator(p_user_id uuid)` — SECURITY DEFINER | anon + authenticated | Ídem anterior. | **Bajo**: mismo oráculo booleano. | Ídem (`_roles`) |
| `eliminar_contenido_moderado(p_tabla, p_item_id, p_justificacion)` — SECURITY DEFINER | authenticated | La app la invoca (`src/lib/moderationApi.js`). El cuerpo exige `is_pemtree_admin()` antes de borrar y registra en `moderation_audit_log`. | **Medio-bajo**: cualquier autenticado puede invocarla, pero sin rol admin no ejecuta acciones destructivas (lanza excepción). | Migrar a Edge Function con `service_role` y revocar EXECUTE |
| `ocultar_contenido_moderado(p_tabla, p_item_id, p_justificacion)` — SECURITY DEFINER | authenticated | La app la invoca. El cuerpo exige dueño/admin/mod; moderador sobre contenido ajeno requiere justificación. | **Medio-bajo**: no escala sin permiso; el peor caso es un moderador ocultando con justificación (comportamiento esperado). | Ídem |
| `restaurar_contenido_moderado(p_tabla, p_item_id)` — SECURITY DEFINER | authenticated | La app la invoca. El cuerpo exige dueño/admin/mod. | **Medio-bajo**: no escala sin permiso. | Ídem |

## Acciones pendientes (no aceptación)

| Finding | Acción |
|---|---|
| `auth_leaked_password_protection` | Habilitar en Dashboard de Supabase → Authentication (no se puede por SQL). |

## Notas de mitigación ya ejecutadas (histórico 2026-08-10)

- Eliminadas 5 políticas RLS `always_true` explotables en `posts`, `comments`,
  `post_likes`, `whatsapp_group_upvotes`; `whatsapp_groups` INSERT ahora exige
  `auth.uid() = user_id`.
- Contadores (`likes`, `upvotes`, `reported_count`) se auto-sincronizan vía
  triggers en schema `_triggers` (no expuesto por PostgREST).
- `user_roles` y `whatsapp_group_reports` ya no son de lectura pública.
- `search_path` fijado en `check_whatsapp_groups_limit`,
  `check_content_moderation`, `reset_moderation_on_edit`.
- `purge_*` restringidas a `service_role`/`postgres`.
- Admin hardcodeado inválido (`114631336471842858804`, no UUID) eliminado.

## Decisión

- Aprobado por: propietario de PEMTREE.
- Fecha: 2026-08-10.
- Próxima revisión: 2027-02-10 (o ante cualquier cambio de esquema/auth).
- Verificación periódica: re-ejecutar `supabase get_advisors` (security) y
  marcar como cerrado cualquier hallazgo que desaparezca.
