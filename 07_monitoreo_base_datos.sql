
-- MONITOREO DE LA BASE DE DATOS


SELECT
    current_user AS usuario_actual,
    current_database() AS base_datos,
    current_schema() AS esquema,
    version() AS version_postgresql;


------------ 1. DISPONIBILIDAD Y ESTADO GENERAL ----------------


SELECT
    datname AS base_datos,
    datallowconn AS permite_conexiones,
    datconnlimit AS limite_conexiones
FROM pg_database
WHERE datname = current_database();

SELECT
    CASE
        WHEN COUNT(*) = 7
            THEN 'Base disponible y estructura completa'
        ELSE 'Revisar estructura de tablas'
    END AS estado_solucion,
    COUNT(*) AS tablas_encontradas
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
      'cliente',
      'categoria_vehiculo',
      'vehiculo',
      'reserva',
      'alquiler',
      'pago',
      'mantenimiento'
  );


------------------ 2. TAMANO TOTAL DE LA BASE DE DATOS -----------------


SELECT
    current_database() AS base_datos,
    pg_database_size(current_database()) AS tamano_bytes,
    pg_size_pretty(
        pg_database_size(current_database())
    ) AS tamano_legible;



------------------ 3. CRECIMIENTO DE TABLAS E INDICES --------------------


SELECT
    relname AS tabla,
    pg_size_pretty(
        pg_relation_size(relid)
    ) AS solo_tabla,
    pg_size_pretty(
        pg_indexes_size(relid)
    ) AS indices,
    pg_size_pretty(
        pg_total_relation_size(relid)
    ) AS tamano_total
FROM pg_catalog.pg_statio_user_tables
ORDER BY
    pg_total_relation_size(relid) DESC;




------------------- 4. CANTIDAD ACTUAL DE REGISTROS -----------------


SELECT 'categoria_vehiculo' AS tabla, COUNT(*) AS registros
FROM public.categoria_vehiculo

UNION ALL

SELECT 'cliente', COUNT(*)
FROM public.cliente

UNION ALL

SELECT 'vehiculo', COUNT(*)
FROM public.vehiculo

UNION ALL

SELECT 'mantenimiento', COUNT(*)
FROM public.mantenimiento

UNION ALL

SELECT 'reserva', COUNT(*)
FROM public.reserva

UNION ALL

SELECT 'alquiler', COUNT(*)
FROM public.alquiler

UNION ALL

SELECT 'pago', COUNT(*)
FROM public.pago

UNION ALL

SELECT 'TOTAL', (
    (SELECT COUNT(*) FROM public.categoria_vehiculo) +
    (SELECT COUNT(*) FROM public.cliente) +
    (SELECT COUNT(*) FROM public.vehiculo) +
    (SELECT COUNT(*) FROM public.mantenimiento) +
    (SELECT COUNT(*) FROM public.reserva) +
    (SELECT COUNT(*) FROM public.alquiler) +
    (SELECT COUNT(*) FROM public.pago)
)
ORDER BY tabla;



------------------ 5. CONEXIONES A LA BASE DE DATOS -------------------


SELECT
    pid,
    usename AS usuario,
    datname AS base_datos,
    application_name AS aplicacion,
    client_addr AS direccion_cliente,
    state AS estado,
    backend_start AS inicio_conexion,
    state_change AS ultimo_cambio
FROM pg_stat_activity
WHERE datname = current_database()
ORDER BY backend_start;





------------------ 6. RESUMEN DE CONEXIONES-----------------------------


SELECT
    usename AS usuario,
    state AS estado,
    COUNT(*) AS cantidad_conexiones
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY usename, state
ORDER BY usename, state;


 
---------------------- 7. CONSULTAS ACTIVAS ----------------------------


SELECT
    pid,
    usename AS usuario,
    application_name AS aplicacion,
    state AS estado,
    query_start AS inicio_consulta,
    clock_timestamp() - query_start AS duracion,
    LEFT(query, 200) AS consulta
FROM pg_stat_activity
WHERE datname = current_database()
  AND state = 'active'
  AND pid <> pg_backend_pid()
ORDER BY query_start;




----------------- 8. SESIONES INACTIVAS DENTRO DE TRANSACCIONES -----------------


SELECT
    pid,
    usename AS usuario,
    state AS estado,
    xact_start AS inicio_transaccion,
    clock_timestamp() - xact_start AS duracion,
    LEFT(query, 200) AS ultima_consulta
FROM pg_stat_activity
WHERE datname = current_database()
  AND state = 'idle in transaction'
ORDER BY xact_start;



------------------------ 9. ACTIVIDAD DE LAS TABLAS ------------------------


SELECT
    relname AS tabla,
    seq_scan AS lecturas_secuenciales,
    idx_scan AS lecturas_por_indice,
    n_tup_ins AS filas_insertadas,
    n_tup_upd AS filas_actualizadas,
    n_tup_del AS filas_eliminadas,
    n_live_tup AS filas_vivas_estimadas,
    n_dead_tup AS filas_muertas_estimadas,
    last_analyze AS ultimo_analisis,
    last_autoanalyze AS ultimo_autoanalisis,
    last_vacuum AS ultimo_vacuum,
    last_autovacuum AS ultimo_autovacuum
FROM pg_stat_user_tables
ORDER BY relname;



----------------------- 10. USO DE INDICES ------------------------------


SELECT
    schemaname AS esquema,
    relname AS tabla,
    indexrelname AS indice,
    idx_scan AS cantidad_usos,
    idx_tup_read AS filas_leidas,
    idx_tup_fetch AS filas_recuperadas,
    pg_size_pretty(
        pg_relation_size(indexrelid)
    ) AS tamano_indice
FROM pg_stat_user_indexes
ORDER BY
    idx_scan DESC,
    relname,
    indexrelname;



-------------------- 11. USUARIOS Y ROLES CREADOS ----------------------

SELECT
    rolname AS nombre,
    rolcanlogin AS puede_iniciar_sesion,
    rolsuper AS es_superusuario,
    rolcreaterole AS puede_crear_roles,
    rolcreatedb AS puede_crear_bases
FROM pg_roles
WHERE rolname IN (
    'rol_administrador_bd',
    'rol_operador_alquiler',
    'rol_contabilidad',
    'rol_mantenimiento',
    'rol_consulta',
    'usuario_admin_bd',
    'usuario_operador',
    'usuario_contabilidad',
    'usuario_mantenimiento',
    'usuario_consulta'
)
ORDER BY rolname;


SELECT
    miembro.rolname AS usuario,
    grupo.rolname AS rol_asignado
FROM pg_auth_members AS asignacion
INNER JOIN pg_roles AS grupo
    ON grupo.oid = asignacion.roleid
INNER JOIN pg_roles AS miembro
    ON miembro.oid = asignacion.member
WHERE grupo.rolname IN (
    'rol_administrador_bd',
    'rol_operador_alquiler',
    'rol_contabilidad',
    'rol_mantenimiento',
    'rol_consulta'
)
ORDER BY miembro.rolname;


