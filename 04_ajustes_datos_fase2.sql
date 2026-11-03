SELECT
    id_cliente,
    numero_documento,
    correo_electronico
FROM cliente
WHERE numero_documento = '1020304050';

BEGIN;

UPDATE cliente
SET correo_electronico = 'laura.gomez.actualizado@example.com'
WHERE numero_documento = '1020304050';

SELECT
    id_cliente,
    numero_documento,
    correo_electronico
FROM cliente
WHERE numero_documento = '1020304050';


COMMIT;


SELECT
    v.placa,
    v.kilometraje AS kilometraje_actual,
    MAX(a.kilometraje_entrada) AS ultimo_kilometraje_registrado
FROM vehiculo AS v
INNER JOIN alquiler AS a
    ON a.id_vehiculo = v.id_vehiculo
WHERE v.placa = 'STU345'
GROUP BY
    v.placa,
    v.kilometraje;


BEGIN;

UPDATE vehiculo
SET kilometraje = 55200
WHERE placa = 'STU345';

SELECT
    placa,
    kilometraje
FROM vehiculo
WHERE placa = 'STU345';

COMMIT;


SELECT
    (SELECT COUNT(*) FROM categoria_vehiculo) AS categorias,
    (SELECT COUNT(*) FROM cliente) AS clientes,
    (SELECT COUNT(*) FROM vehiculo) AS vehiculos,
    (SELECT COUNT(*) FROM mantenimiento) AS mantenimientos,
    (SELECT COUNT(*) FROM reserva) AS reservas,
    (SELECT COUNT(*) FROM alquiler) AS alquileres,
    (SELECT COUNT(*) FROM pago) AS pagos,
    (
        (SELECT COUNT(*) FROM categoria_vehiculo) +
        (SELECT COUNT(*) FROM cliente) +
        (SELECT COUNT(*) FROM vehiculo) +
        (SELECT COUNT(*) FROM mantenimiento) +
        (SELECT COUNT(*) FROM reserva) +
        (SELECT COUNT(*) FROM alquiler) +
        (SELECT COUNT(*) FROM pago)
    ) AS total_registros;



BEGIN;

-- ============================================================
-- 1. TRES CLIENTES NUEVOS
-- Total acumulado de nuevos registros: 3
-- ============================================================

INSERT INTO cliente (
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
VALUES
(
    'Cedula',
    '1050607080',
    'Ana Maria',
    'Rojas Castillo',
    '3159012345',
    'ana.rojas@example.com',
    'LC-10006',
    '2029-06-15',
    'Bogota',
    'Activo'
),
(
    'Cedula',
    '1060708090',
    'Miguel Andres',
    'Vargas Moreno',
    '3160123456',
    'miguel.vargas@example.com',
    'LC-10007',
    '2028-10-20',
    'Cajica',
    'Activo'
),
(
    'Pasaporte',
    'PB112233',
    'Julian',
    'Silva Hernandez',
    '3171234567',
    'julian.silva@example.com',
    'LC-10008',
    '2028-12-05',
    'Bogota',
    'Bloqueado'
);


-- ============================================================
-- 2. TRES VEHICULOS NUEVOS
-- Total acumulado de nuevos registros: 6
-- ============================================================

INSERT INTO vehiculo (
    id_categoria,
    placa,
    marca,
    modelo,
    anio,
    color,
    numero_chasis,
    kilometraje,
    estado_vehiculo
)
VALUES
(
    (
        SELECT id_categoria
        FROM categoria_vehiculo
        WHERE nombre_categoria = 'Compacto'
    ),
    'KLM901',
    'Kia',
    'Picanto',
    2024,
    'Blanco',
    'CHASIS-0009',
    8050,
    'Disponible'
),
(
    (
        SELECT id_categoria
        FROM categoria_vehiculo
        WHERE nombre_categoria = 'Sedan'
    ),
    'NOP234',
    'Nissan',
    'Versa',
    2023,
    'Gris',
    'CHASIS-0010',
    18600,
    'Reservado'
),
(
    (
        SELECT id_categoria
        FROM categoria_vehiculo
        WHERE nombre_categoria = 'SUV'
    ),
    'QRS567',
    'Hyundai',
    'Tucson',
    2023,
    'Azul',
    'CHASIS-0011',
    32600,
    'Alquilado'
);


-- ============================================================
-- 3. DOS MANTENIMIENTOS NUEVOS
-- Total acumulado de nuevos registros: 8
-- ============================================================

INSERT INTO mantenimiento (
    id_vehiculo,
    tipo_mantenimiento,
    fecha_inicio,
    fecha_fin,
    descripcion,
    costo,
    kilometraje_mantenimiento,
    estado_mantenimiento,
    taller_responsable
)
VALUES
(
    (
        SELECT id_vehiculo
        FROM vehiculo
        WHERE placa = 'KLM901'
    ),
    'Preventivo',
    '2026-07-30 08:00:00',
    '2026-07-30 13:00:00',
    'Cambio de aceite, filtros y revisión general',
    310000.00,
    7800,
    'Finalizado',
    'Centro de Servicio Automotriz Norte'
),
(
    (
        SELECT id_vehiculo
        FROM vehiculo
        WHERE placa = 'NOP234'
    ),
    'Preventivo',
    '2026-07-25 09:00:00',
    '2026-07-25 16:00:00',
    'Revisión de frenos, llantas y sistema eléctrico',
    420000.00,
    17500,
    'Finalizado',
    'Taller Automotriz Los Andes'
);


-- ============================================================
-- 4. CUATRO RESERVAS NUEVAS
-- Total acumulado de nuevos registros: 12
-- ============================================================

INSERT INTO reserva (
    id_cliente,
    id_vehiculo,
    fecha_reserva,
    fecha_inicio,
    fecha_fin,
    estado_reserva,
    valor_estimado,
    observaciones
)
VALUES
(
    (
        SELECT id_cliente
        FROM cliente
        WHERE numero_documento = '1050607080'
    ),
    (
        SELECT id_vehiculo
        FROM vehiculo
        WHERE placa = 'KLM901'
    ),
    '2026-07-28 10:00:00',
    '2026-08-05 08:00:00',
    '2026-08-07 18:00:00',
    'Cumplida',
    240000.00,
    'Reserva cumplida y convertida posteriormente en alquiler'
),
(
    (
        SELECT id_cliente
        FROM cliente
        WHERE numero_documento = '1060708090'
    ),
    (
        SELECT id_vehiculo
        FROM vehiculo
        WHERE placa = 'NOP234'
    ),
    '2026-08-22 09:30:00',
    '2026-09-05 08:00:00',
    '2026-09-08 18:00:00',
    'Confirmada',
    480000.00,
    'Reserva confirmada para viaje intermunicipal'
),
(
    (
        SELECT id_cliente
        FROM cliente
        WHERE numero_documento = '1050607080'
    ),
    (
        SELECT id_vehiculo
        FROM vehiculo
        WHERE placa = 'QRS567'
    ),
    '2026-08-23 11:00:00',
    '2026-09-20 08:00:00',
    '2026-09-22 18:00:00',
    'Pendiente',
    440000.00,
    'Reserva pendiente de confirmación por parte del cliente'
),
(
    (
        SELECT id_cliente
        FROM cliente
        WHERE numero_documento = 'PA908070'
    ),
    (
        SELECT id_vehiculo
        FROM vehiculo
        WHERE placa = 'KLM901'
    ),
    '2026-08-23 15:00:00',
    '2026-09-15 08:00:00',
    '2026-09-16 18:00:00',
    'Cancelada',
    120000.00,
    'Reserva cancelada por solicitud del cliente'
);


-- ============================================================
-- 5. TRES ALQUILERES NUEVOS
-- Total acumulado de nuevos registros: 15
-- ============================================================

-- Alquiler 1:
-- Se origina en una reserva cumplida.
-- El cliente y el vehiculo se obtienen directamente de la reserva.

INSERT INTO alquiler (
    id_cliente,
    id_vehiculo,
    id_reserva,
    fecha_entrega,
    fecha_devolucion_programada,
    fecha_devolucion_real,
    kilometraje_salida,
    kilometraje_entrada,
    nivel_combustible_salida,
    nivel_combustible_entrada,
    valor_total,
    estado_alquiler,
    observaciones
)
SELECT
    r.id_cliente,
    r.id_vehiculo,
    r.id_reserva,
    '2026-08-05 08:00:00',
    '2026-08-07 18:00:00',
    '2026-08-07 17:30:00',
    7800,
    8050,
    100.00,
    80.00,
    240000.00,
    'Finalizado',
    'Alquiler originado a partir de una reserva cumplida'
FROM reserva AS r
INNER JOIN cliente AS c
    ON c.id_cliente = r.id_cliente
INNER JOIN vehiculo AS v
    ON v.id_vehiculo = r.id_vehiculo
WHERE c.numero_documento = '1050607080'
  AND v.placa = 'KLM901'
  AND r.fecha_inicio = '2026-08-05 08:00:00';


-- Alquiler 2:
-- Alquiler directo finalizado, sin reserva previa.

INSERT INTO alquiler (
    id_cliente,
    id_vehiculo,
    id_reserva,
    fecha_entrega,
    fecha_devolucion_programada,
    fecha_devolucion_real,
    kilometraje_salida,
    kilometraje_entrada,
    nivel_combustible_salida,
    nivel_combustible_entrada,
    valor_total,
    estado_alquiler,
    observaciones
)
VALUES
(
    (
        SELECT id_cliente
        FROM cliente
        WHERE numero_documento = '1060708090'
    ),
    (
        SELECT id_vehiculo
        FROM vehiculo
        WHERE placa = 'NOP234'
    ),
    NULL,
    '2026-08-10 08:00:00',
    '2026-08-12 18:00:00',
    '2026-08-12 17:40:00',
    18000,
    18600,
    100.00,
    85.00,
    320000.00,
    'Finalizado',
    'Alquiler directo finalizado sin novedades'
);


-- Alquiler 3:
-- Alquiler activo con pago parcial.

INSERT INTO alquiler (
    id_cliente,
    id_vehiculo,
    id_reserva,
    fecha_entrega,
    fecha_devolucion_programada,
    fecha_devolucion_real,
    kilometraje_salida,
    kilometraje_entrada,
    nivel_combustible_salida,
    nivel_combustible_entrada,
    valor_total,
    estado_alquiler,
    observaciones
)
VALUES
(
    (
        SELECT id_cliente
        FROM cliente
        WHERE numero_documento = '1050607080'
    ),
    (
        SELECT id_vehiculo
        FROM vehiculo
        WHERE placa = 'QRS567'
    ),
    NULL,
    '2026-08-24 07:30:00',
    '2026-08-27 18:00:00',
    NULL,
    32600,
    NULL,
    100.00,
    NULL,
    660000.00,
    'Activo',
    'Alquiler activo con pago inicial y saldo pendiente'
);


-- ============================================================
-- 6. CUATRO PAGOS NUEVOS
-- Total acumulado de nuevos registros: 19
-- ============================================================

INSERT INTO pago (
    id_alquiler,
    fecha_pago,
    valor_pago,
    metodo_pago,
    referencia_pago,
    estado_pago
)
VALUES
(
    (
        SELECT a.id_alquiler
        FROM alquiler AS a
        INNER JOIN cliente AS c
            ON c.id_cliente = a.id_cliente
        INNER JOIN vehiculo AS v
            ON v.id_vehiculo = a.id_vehiculo
        WHERE c.numero_documento = '1050607080'
          AND v.placa = 'KLM901'
          AND a.fecha_entrega = '2026-08-05 08:00:00'
    ),
    '2026-08-05 08:10:00',
    240000.00,
    'Tarjeta',
    'PAGO-2026-005',
    'Aprobado'
),
(
    (
        SELECT a.id_alquiler
        FROM alquiler AS a
        INNER JOIN cliente AS c
            ON c.id_cliente = a.id_cliente
        INNER JOIN vehiculo AS v
            ON v.id_vehiculo = a.id_vehiculo
        WHERE c.numero_documento = '1060708090'
          AND v.placa = 'NOP234'
          AND a.fecha_entrega = '2026-08-10 08:00:00'
    ),
    '2026-08-10 08:10:00',
    320000.00,
    'Transferencia',
    'PAGO-2026-006',
    'Aprobado'
),
(
    (
        SELECT a.id_alquiler
        FROM alquiler AS a
        INNER JOIN cliente AS c
            ON c.id_cliente = a.id_cliente
        INNER JOIN vehiculo AS v
            ON v.id_vehiculo = a.id_vehiculo
        WHERE c.numero_documento = '1050607080'
          AND v.placa = 'QRS567'
          AND a.fecha_entrega = '2026-08-24 07:30:00'
    ),
    '2026-08-24 07:40:00',
    330000.00,
    'Tarjeta',
    'PAGO-2026-007',
    'Aprobado'
),
(
    (
        SELECT a.id_alquiler
        FROM alquiler AS a
        INNER JOIN cliente AS c
            ON c.id_cliente = a.id_cliente
        INNER JOIN vehiculo AS v
            ON v.id_vehiculo = a.id_vehiculo
        WHERE c.numero_documento = '1050607080'
          AND v.placa = 'QRS567'
          AND a.fecha_entrega = '2026-08-24 07:30:00'
    ),
    '2026-08-24 07:45:00',
    330000.00,
    'Transferencia',
    'PAGO-2026-008',
    'Pendiente'
);


-- ============================================================
-- 7. COMPROBACION ANTES DE CONFIRMAR
-- ============================================================

SELECT 'categoria_vehiculo' AS tabla, COUNT(*) AS cantidad
FROM categoria_vehiculo

UNION ALL

SELECT 'cliente', COUNT(*)
FROM cliente

UNION ALL

SELECT 'vehiculo', COUNT(*)
FROM vehiculo

UNION ALL

SELECT 'mantenimiento', COUNT(*)
FROM mantenimiento

UNION ALL

SELECT 'reserva', COUNT(*)
FROM reserva

UNION ALL

SELECT 'alquiler', COUNT(*)
FROM alquiler

UNION ALL

SELECT 'pago', COUNT(*)
FROM pago

ORDER BY tabla;





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

COMMIT;



SELECT
    r.id_reserva,
    r.estado_reserva,
    c.numero_documento,
    CONCAT(c.nombres, ' ', c.apellidos) AS cliente,
    v.placa,
    CONCAT(v.marca, ' ', v.modelo) AS vehiculo,
    a.id_alquiler,
    a.fecha_entrega,
    a.fecha_devolucion_real,
    a.estado_alquiler
FROM reserva AS r
INNER JOIN cliente AS c
    ON c.id_cliente = r.id_cliente
INNER JOIN vehiculo AS v
    ON v.id_vehiculo = r.id_vehiculo
LEFT JOIN alquiler AS a
    ON a.id_reserva = r.id_reserva
WHERE c.numero_documento = '1050607080'
  AND v.placa = 'KLM901';


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
FROM alquiler AS a
INNER JOIN cliente AS c
    ON c.id_cliente = a.id_cliente
INNER JOIN vehiculo AS v
    ON v.id_vehiculo = a.id_vehiculo
LEFT JOIN pago AS p
    ON p.id_alquiler = a.id_alquiler
GROUP BY
    a.id_alquiler,
    c.nombres,
    c.apellidos,
    v.placa,
    a.valor_total
ORDER BY a.id_alquiler;

