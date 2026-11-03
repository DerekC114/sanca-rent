------------------PRUEBA DE INSERCION----------------------
BEGIN;

INSERT INTO public.cliente (
    tipo_documento,
    numero_documento,
    nombres,
    apellidos,
    telefono,
    correo_electronico,
    numero_licencia,
    fecha_vencimiento_licencia,
    direccion,
    estado_cliente
)
VALUES (
    'Cedula',
    '10245789945',
    'carlos',
    'diaz',
    '3005550011',
    'prueba.insercion@gmail.com.com',
    'LC-PRUEBA01',
    '2029-12-31',
    'Bogota',
    'Activo'
);

SELECT
    numero_documento,
    nombres,
    apellidos,
    correo_electronico,
    estado_cliente
FROM public.cliente
WHERE numero_documento = '10245789945';

ROLLBACK;


------------- PRUEBA DE CONSULTA-------------

SELECT
    v.placa,
    v.marca,
    v.modelo,
    c.nombre_categoria AS categoria,
    c.tarifa_diaria_base,
    v.estado_vehiculo
FROM public.vehiculo AS v
INNER JOIN public.categoria_vehiculo AS c
    ON c.id_categoria = v.id_categoria
ORDER BY c.nombre_categoria, v.placa;

--------- PRUEBA DE ACTUALIACION-----------

BEGIN;

SELECT
    numero_documento,
    telefono
FROM public.cliente
WHERE numero_documento = '1020304050';

UPDATE public.cliente
SET telefono = '3009998877'
WHERE numero_documento = '1020304050';

SELECT
    numero_documento,
    telefono
FROM public.cliente
WHERE numero_documento = '1020304050';

ROLLBACK;

------------ PRUEBA DE ELIMINACION ---------

BEGIN;

INSERT INTO public.cliente (
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
    '10245789945',
    'Cliente',
    'Prueba Eliminacion',
    '3004443322',
    'prueba.eliminacion@gmail.com.com',
    'LC-PRUEBA01',
    '2029-12-31',
    'Activo'
);

DELETE FROM public.cliente
WHERE numero_documento = '10245789945';

SELECT COUNT(*) AS registros_encontrados
FROM public.cliente
WHERE numero_documento = '10245789945';

ROLLBACK;

----------------- PRUEBA DE RELACIONES ---------------

SELECT
    r.id_reserva,
    c.numero_documento,
    CONCAT(c.nombres, ' ', c.apellidos) AS cliente,
    v.placa,
    CONCAT(v.marca, ' ', v.modelo) AS vehiculo,
    r.fecha_inicio,
    r.fecha_fin,
    r.estado_reserva
FROM public.reserva AS r
INNER JOIN public.cliente AS c
    ON c.id_cliente = r.id_cliente
INNER JOIN public.vehiculo AS v
    ON v.id_vehiculo = r.id_vehiculo
ORDER BY r.id_reserva;


------------ PRUEBA DE RESTRICCIONES ------------------


INSERT INTO public.pago (
    id_alquiler,
    fecha_pago,
    valor_pago,
    metodo_pago,
    referencia_pago,
    estado_pago
)
VALUES (
    (SELECT MIN(id_alquiler) FROM public.alquiler),
    CURRENT_TIMESTAMP,
    -50000.00,
    'Efectivo',
    'PRUEBA-PAGO-NEGATIVO',
    'Aprobado'
);

ROLLBACK;


---------------PRUEBA DE INTEGRIDAD REFERENCIAL -----------

INSERT INTO public.reserva (
    id_cliente,
    id_vehiculo,
    fecha_inicio,
    fecha_fin,
    estado_reserva,
    valor_estimado
)
VALUES (
    999999,
    (SELECT MIN(id_vehiculo) FROM public.vehiculo),
    '2026-11-10 08:00:00',
    '2026-11-12 18:00:00',
    'Pendiente',
    240000.00
);

ROLLBACK;


----------------- PRUEBA DE CONSULTA COMPLEJA -----------



SELECT
    a.id_alquiler,
    CONCAT(c.nombres, ' ', c.apellidos) AS cliente,
    v.placa,
    a.valor_total,
    COALESCE(
        SUM(p.valor_pago)
        FILTER (WHERE p.estado_pago = 'Aprobado'),
        0
    ) AS total_aprobado,
    a.valor_total -
    COALESCE(
        SUM(p.valor_pago)
        FILTER (WHERE p.estado_pago = 'Aprobado'),
        0
    ) AS saldo_pendiente,
    COUNT(p.id_pago) AS cantidad_pagos
FROM public.alquiler AS a
INNER JOIN public.cliente AS c
    ON c.id_cliente = a.id_cliente
INNER JOIN public.vehiculo AS v
    ON v.id_vehiculo = a.id_vehiculo
LEFT JOIN public.pago AS p
    ON p.id_alquiler = a.id_alquiler
GROUP BY
    a.id_alquiler,
    c.nombres,
    c.apellidos,
    v.placa,
    a.valor_total
ORDER BY a.id_alquiler;







------------ EVIDENCIA BASE DE DATOS  ----------------

SELECT
    current_database() AS base_datos,
    current_schema() AS esquema,
    current_user AS usuario,
    current_setting('server_version') AS version_postgresql;

------------ EVIDENCIA TABLAS IMPLEMENTADAS ------------

SELECT
    table_name AS tabla
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

------------EVIDENCIA USUARIOS Y ROLES -------------------


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


------------ EVIDENCIA DE MONITOREO --------


SELECT
    pid,
    usename AS usuario,
    application_name AS aplicacion,
    state AS estado,
    backend_start AS inicio_conexion
FROM pg_stat_activity
WHERE datname = current_database()
ORDER BY backend_start;










