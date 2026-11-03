SELECT
    current_database() AS base_datos,
    current_schema() AS esquema,
    current_user AS usuario_actual,
    version() AS version_postgresql;
	

SELECT
    current_database() AS base_datos,
    current_user AS usuario_actual,
    r.rolsuper AS es_superusuario,
    r.rolcreaterole AS puede_crear_roles
FROM pg_roles AS r
WHERE r.rolname = current_user;

-- ============================================================
-- APARTADO 9. INTEGRIDAD DE LOS DATOS
-- 1. RESTRICCIONES IMPLEMENTADAS
-- ============================================================

SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.table_constraints AS tc
WHERE tc.table_schema = 'public'
  AND tc.table_name IN (
      'cliente',
      'categoria_vehiculo',
      'vehiculo',
      'reserva',
      'alquiler',
      'pago',
      'mantenimiento'
  )
ORDER BY
    tc.table_name,
    tc.constraint_type,
    tc.constraint_name;


-- 2. RESERVAS SIN CLIENTE VALIDO
SELECT r.*
FROM reserva AS r
LEFT JOIN cliente AS c
    ON c.id_cliente = r.id_cliente
WHERE c.id_cliente IS NULL;


-- 3. RESERVAS SIN VEHICULO VALIDO
SELECT r.*
FROM reserva AS r
LEFT JOIN vehiculo AS v
    ON v.id_vehiculo = r.id_vehiculo
WHERE v.id_vehiculo IS NULL;


-- 4. ALQUILERES SIN CLIENTE O VEHICULO VALIDO
SELECT a.*
FROM alquiler AS a
LEFT JOIN cliente AS c
    ON c.id_cliente = a.id_cliente
LEFT JOIN vehiculo AS v
    ON v.id_vehiculo = a.id_vehiculo
WHERE c.id_cliente IS NULL
   OR v.id_vehiculo IS NULL;


-- 5. PAGOS SIN ALQUILER VALIDO
SELECT p.*
FROM pago AS p
LEFT JOIN alquiler AS a
    ON a.id_alquiler = p.id_alquiler
WHERE a.id_alquiler IS NULL;


-- 6. MANTENIMIENTOS SIN VEHICULO VALIDO
SELECT m.*
FROM mantenimiento AS m
LEFT JOIN vehiculo AS v
    ON v.id_vehiculo = m.id_vehiculo
WHERE v.id_vehiculo IS NULL;



-- 7. BUSQUEDA DE VALORES FUERA DE DOMINIO

SELECT *
FROM vehiculo
WHERE kilometraje < 0
   OR anio NOT BETWEEN 1980 AND 2100;

SELECT *
FROM reserva
WHERE fecha_fin <= fecha_inicio
   OR valor_estimado <= 0;

SELECT *
FROM alquiler
WHERE fecha_devolucion_programada <= fecha_entrega
   OR valor_total <= 0
   OR kilometraje_salida < 0
   OR nivel_combustible_salida NOT BETWEEN 0 AND 100
   OR (
       kilometraje_entrada IS NOT NULL
       AND kilometraje_entrada < kilometraje_salida
   );

SELECT *
FROM pago
WHERE valor_pago <= 0;

SELECT *
FROM mantenimiento
WHERE costo < 0
   OR kilometraje_mantenimiento < 0
   OR (
       fecha_fin IS NOT NULL
       AND fecha_fin < fecha_inicio
   );

-- ============================================================
-- 8. PRUEBAS CONTROLADAS DE INTEGRIDAD
-- ============================================================

DO $$
BEGIN
    BEGIN
        INSERT INTO cliente (
            tipo_documento,
            numero_documento,
            nombres,
            apellidos,
            telefono,
            correo_electronico,
            numero_licencia,
            fecha_vencimiento_licencia,
            estado_cliente
        )
        VALUES (
            'Cedula',
            '1020304050',
            'Prueba',
            'Documento duplicado',
            '3000000000',
            'prueba.duplicado@example.com',
            'LC-PRUEBA-DUP',
            '2029-01-01',
            'Activo'
        );

        RAISE EXCEPTION
            'La prueba fallo: se permitio el documento duplicado';

    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE
                'PRUEBA APROBADA: el documento duplicado fue rechazado';
    END;
END;
$$;


DO $$
BEGIN
    BEGIN
        INSERT INTO pago (
            id_alquiler,
            valor_pago,
            metodo_pago,
            referencia_pago,
            estado_pago
        )
        VALUES (
            (SELECT MIN(id_alquiler) FROM alquiler),
            -50000,
            'Efectivo',
            'PAGO-PRUEBA-NEGATIVO',
            'Aprobado'
        );

        RAISE EXCEPTION
            'La prueba fallo: se permitio un pago negativo';

    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE
                'PRUEBA APROBADA: el pago negativo fue rechazado';
    END;
END;
$$;


DO $$
BEGIN
    BEGIN
        INSERT INTO reserva (
            id_cliente,
            id_vehiculo,
            fecha_inicio,
            fecha_fin,
            estado_reserva,
            valor_estimado
        )
        VALUES (
            999999,
            (SELECT MIN(id_vehiculo) FROM vehiculo),
            '2026-11-10 08:00:00',
            '2026-11-12 18:00:00',
            'Pendiente',
            240000
        );

        RAISE EXCEPTION
            'La prueba fallo: se permitio un cliente inexistente';

    EXCEPTION
        WHEN foreign_key_violation THEN
            RAISE NOTICE
                'PRUEBA APROBADA: la referencia inexistente fue rechazada';
    END;
END;
$$;

SELECT
    (
        (SELECT COUNT(*) FROM categoria_vehiculo) +
        (SELECT COUNT(*) FROM cliente) +
        (SELECT COUNT(*) FROM vehiculo) +
        (SELECT COUNT(*) FROM mantenimiento) +
        (SELECT COUNT(*) FROM reserva) +
        (SELECT COUNT(*) FROM alquiler) +
        (SELECT COUNT(*) FROM pago)
    ) AS total_registros;



-- ============================================================
-- APARTADO 9. SEGURIDAD
-- 1. ROLES FUNCIONALES SIN LOGIN
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = 'rol_administrador_bd'
    ) THEN
        CREATE ROLE rol_administrador_bd NOLOGIN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = 'rol_operador_alquiler'
    ) THEN
        CREATE ROLE rol_operador_alquiler NOLOGIN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = 'rol_contabilidad'
    ) THEN
        CREATE ROLE rol_contabilidad NOLOGIN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = 'rol_mantenimiento'
    ) THEN
        CREATE ROLE rol_mantenimiento NOLOGIN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = 'rol_consulta'
    ) THEN
        CREATE ROLE rol_consulta NOLOGIN;
    END IF;
END;
$$;


-- 2. USUARIOS CON LOGIN

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = 'usuario_admin_bd'
    ) THEN
        CREATE ROLE usuario_admin_bd
        LOGIN PASSWORD 'Cambiar_Admin_2026!';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = 'usuario_operador'
    ) THEN
        CREATE ROLE usuario_operador
        LOGIN PASSWORD 'Cambiar_Operador_2026!';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = 'usuario_contabilidad'
    ) THEN
        CREATE ROLE usuario_contabilidad
        LOGIN PASSWORD 'Cambiar_Contabilidad_2026!';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = 'usuario_mantenimiento'
    ) THEN
        CREATE ROLE usuario_mantenimiento
        LOGIN PASSWORD 'Cambiar_Mantenimiento_2026!';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = 'usuario_consulta'
    ) THEN
        CREATE ROLE usuario_consulta
        LOGIN PASSWORD 'Cambiar_Consulta_2026!';
    END IF;
END;
$$;


-- 3. ASIGNACION DE ROLES

GRANT rol_administrador_bd
TO usuario_admin_bd;

GRANT rol_operador_alquiler
TO usuario_operador;

GRANT rol_contabilidad
TO usuario_contabilidad;

GRANT rol_mantenimiento
TO usuario_mantenimiento;

GRANT rol_consulta
TO usuario_consulta;


REVOKE ALL PRIVILEGES
ON ALL TABLES IN SCHEMA public
FROM
    rol_administrador_bd,
    rol_operador_alquiler,
    rol_contabilidad,
    rol_mantenimiento,
    rol_consulta;

REVOKE ALL PRIVILEGES
ON ALL SEQUENCES IN SCHEMA public
FROM
    rol_administrador_bd,
    rol_operador_alquiler,
    rol_contabilidad,
    rol_mantenimiento,
    rol_consulta;

GRANT USAGE ON SCHEMA public
TO
    rol_administrador_bd,
    rol_operador_alquiler,
    rol_contabilidad,
    rol_mantenimiento,
    rol_consulta;

-- 4. ADMINISTRADOR

GRANT ALL PRIVILEGES
ON ALL TABLES IN SCHEMA public
TO rol_administrador_bd;

GRANT ALL PRIVILEGES
ON ALL SEQUENCES IN SCHEMA public
TO rol_administrador_bd;

-- 5. OPERADOR DE ALQUILERES

GRANT SELECT
ON categoria_vehiculo, vehiculo, pago, mantenimiento
TO rol_operador_alquiler;

GRANT SELECT, INSERT, UPDATE
ON cliente, reserva, alquiler
TO rol_operador_alquiler;

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO rol_operador_alquiler;

-- 6. CONTABILIDAD

GRANT SELECT
ON cliente, vehiculo, alquiler, pago
TO rol_contabilidad;

GRANT INSERT, UPDATE
ON pago
TO rol_contabilidad;

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO rol_contabilidad;

-- 7. PERSONAL DE MANTENIMIENTO

GRANT SELECT
ON vehiculo, categoria_vehiculo, mantenimiento
TO rol_mantenimiento;

GRANT INSERT, UPDATE
ON mantenimiento
TO rol_mantenimiento;

GRANT UPDATE (estado_vehiculo, kilometraje)
ON vehiculo
TO rol_mantenimiento;

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO rol_mantenimiento;

-- 8. USUARIO DE SOLO LECTURA

GRANT SELECT
ON
    categoria_vehiculo,
    vehiculo,
    reserva,
    alquiler,
    mantenimiento
TO rol_consulta;


SELECT
    rolname AS nombre,
    CASE
        WHEN rolcanlogin THEN 'Usuario con login'
        ELSE 'Rol grupal sin login'
    END AS tipo,
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
ORDER BY tipo, nombre;


SELECT
    usuario.rolname AS usuario,
    rol_grupal.rolname AS rol_asignado
FROM pg_auth_members AS asignacion
INNER JOIN pg_roles AS rol_grupal
    ON rol_grupal.oid = asignacion.roleid
INNER JOIN pg_roles AS usuario
    ON usuario.oid = asignacion.member
WHERE rol_grupal.rolname IN (
    'rol_administrador_bd',
    'rol_operador_alquiler',
    'rol_contabilidad',
    'rol_mantenimiento',
    'rol_consulta'
)
ORDER BY usuario.rolname;



SELECT
    usuario,
    tabla,
    has_table_privilege(usuario, tabla, 'SELECT') AS puede_consultar,
    has_table_privilege(usuario, tabla, 'INSERT') AS puede_insertar,
    has_table_privilege(usuario, tabla, 'UPDATE') AS puede_actualizar,
    has_table_privilege(usuario, tabla, 'DELETE') AS puede_eliminar
FROM (
    VALUES
        ('usuario_admin_bd', 'cliente'),
        ('usuario_admin_bd', 'vehiculo'),
        ('usuario_admin_bd', 'reserva'),
        ('usuario_admin_bd', 'alquiler'),
        ('usuario_admin_bd', 'pago'),
        ('usuario_admin_bd', 'mantenimiento'),

        ('usuario_operador', 'cliente'),
        ('usuario_operador', 'vehiculo'),
        ('usuario_operador', 'reserva'),
        ('usuario_operador', 'alquiler'),
        ('usuario_operador', 'pago'),
        ('usuario_operador', 'mantenimiento'),

        ('usuario_contabilidad', 'cliente'),
        ('usuario_contabilidad', 'vehiculo'),
        ('usuario_contabilidad', 'alquiler'),
        ('usuario_contabilidad', 'pago'),

        ('usuario_mantenimiento', 'vehiculo'),
        ('usuario_mantenimiento', 'mantenimiento'),
        ('usuario_mantenimiento', 'cliente'),
        ('usuario_mantenimiento', 'pago'),

        ('usuario_consulta', 'vehiculo'),
        ('usuario_consulta', 'categoria_vehiculo'),
        ('usuario_consulta', 'reserva'),
        ('usuario_consulta', 'alquiler'),
        ('usuario_consulta', 'mantenimiento'),
        ('usuario_consulta', 'cliente'),
        ('usuario_consulta', 'pago')
) AS permisos(usuario, tabla)
ORDER BY usuario, tabla;




SELECT
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN (
      'rol_administrador_bd',
      'rol_operador_alquiler',
      'rol_contabilidad',
      'rol_mantenimiento',
      'rol_consulta'
  )
ORDER BY
    grantee,
    table_name,
    privilege_type;



