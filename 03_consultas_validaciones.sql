
SELECT
    table_name,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name IN (
      'cliente',
      'categoria_vehiculo',
      'vehiculo',
      'reserva',
      'alquiler',
      'pago',
      'mantenimiento'
  )
ORDER BY table_name, constraint_type, constraint_name;


-- 1. COMPROBACION GENERAL DE REGISTROS
-- ============================================================

SELECT 'Categorias' AS tabla, COUNT(*) AS cantidad
FROM categoria_vehiculo

UNION ALL

SELECT 'Clientes', COUNT(*)
FROM cliente

UNION ALL

SELECT 'Vehiculos', COUNT(*)
FROM vehiculo

UNION ALL

SELECT 'Mantenimientos', COUNT(*)
FROM mantenimiento

UNION ALL

SELECT 'Reservas', COUNT(*)
FROM reserva

UNION ALL

SELECT 'Alquileres', COUNT(*)
FROM alquiler

UNION ALL

SELECT 'Pagos', COUNT(*)
FROM pago;


-- 2. VEHICULOS CON SU CATEGORIA
-- ============================================================

SELECT
    v.id_vehiculo,
    v.placa,
    v.marca,
    v.modelo,
    v.anio,
    v.color,
    c.nombre_categoria AS categoria,
    c.tarifa_diaria_base,
    v.kilometraje,
    v.estado_vehiculo
FROM vehiculo AS v
INNER JOIN categoria_vehiculo AS c
    ON v.id_categoria = c.id_categoria
ORDER BY v.id_vehiculo;


-- 3. VEHICULOS ACTUALMENTE DISPONIBLES
-- ============================================================

SELECT
    v.id_vehiculo,
    v.placa,
    v.marca,
    v.modelo,
    c.nombre_categoria AS categoria,
    c.tarifa_diaria_base,
    v.estado_vehiculo
FROM vehiculo AS v
INNER JOIN categoria_vehiculo AS c
    ON v.id_categoria = c.id_categoria
WHERE v.estado_vehiculo = 'Disponible'
ORDER BY c.nombre_categoria, v.marca, v.modelo;


-- 4. RESERVAS CON CLIENTE Y VEHICULO
-- ============================================================

SELECT
    r.id_reserva,
    c.numero_documento,
    CONCAT(c.nombres, ' ', c.apellidos) AS cliente,
    v.placa,
    CONCAT(v.marca, ' ', v.modelo) AS vehiculo,
    r.fecha_reserva,
    r.fecha_inicio,
    r.fecha_fin,
    r.estado_reserva,
    r.valor_estimado,
    r.observaciones
FROM reserva AS r
INNER JOIN cliente AS c
    ON r.id_cliente = c.id_cliente
INNER JOIN vehiculo AS v
    ON r.id_vehiculo = v.id_vehiculo
ORDER BY r.fecha_inicio;


-- 5. ALQUILERES CON CLIENTE Y VEHICULO
-- ============================================================

SELECT
    a.id_alquiler,
    c.numero_documento,
    CONCAT(c.nombres, ' ', c.apellidos) AS cliente,
    v.placa,
    CONCAT(v.marca, ' ', v.modelo) AS vehiculo,
    a.fecha_entrega,
    a.fecha_devolucion_programada,
    a.fecha_devolucion_real,
    a.valor_total,
    a.estado_alquiler,
    a.observaciones
FROM alquiler AS a
INNER JOIN cliente AS c
    ON a.id_cliente = c.id_cliente
INNER JOIN vehiculo AS v
    ON a.id_vehiculo = v.id_vehiculo
ORDER BY a.id_alquiler;


-- 6. PAGOS Y SALDO DE CADA ALQUILER
-- ============================================================

SELECT
    a.id_alquiler,
    CONCAT(c.nombres, ' ', c.apellidos) AS cliente,
    v.placa,
    a.valor_total,
    COALESCE(SUM(p.valor_pago), 0) AS total_pagado,
    a.valor_total - COALESCE(SUM(p.valor_pago), 0)
        AS saldo_pendiente
FROM alquiler AS a
INNER JOIN cliente AS c
    ON a.id_cliente = c.id_cliente
INNER JOIN vehiculo AS v
    ON a.id_vehiculo = v.id_vehiculo
LEFT JOIN pago AS p
    ON a.id_alquiler = p.id_alquiler
    AND p.estado_pago = 'Aprobado'
GROUP BY
    a.id_alquiler,
    c.nombres,
    c.apellidos,
    v.placa,
    a.valor_total
ORDER BY a.id_alquiler;


-- 7. HISTORIAL DE MANTENIMIENTOS
-- ============================================================

SELECT
    m.id_mantenimiento,
    v.placa,
    CONCAT(v.marca, ' ', v.modelo) AS vehiculo,
    m.tipo_mantenimiento,
    m.fecha_inicio,
    m.fecha_fin,
    m.descripcion,
    m.costo,
    m.kilometraje_mantenimiento,
    m.estado_mantenimiento,
    m.taller_responsable
FROM mantenimiento AS m
INNER JOIN vehiculo AS v
    ON m.id_vehiculo = v.id_vehiculo
ORDER BY m.fecha_inicio DESC;


-- 8. HISTORIAL DE ALQUILERES DE UN CLIENTE
-- ============================================================

SELECT
    c.numero_documento,
    CONCAT(c.nombres, ' ', c.apellidos) AS cliente,
    a.id_alquiler,
    v.placa,
    CONCAT(v.marca, ' ', v.modelo) AS vehiculo,
    a.fecha_entrega,
    a.fecha_devolucion_programada,
    a.fecha_devolucion_real,
    a.valor_total,
    a.estado_alquiler
FROM cliente AS c
INNER JOIN alquiler AS a
    ON c.id_cliente = a.id_cliente
INNER JOIN vehiculo AS v
    ON a.id_vehiculo = v.id_vehiculo
WHERE c.numero_documento = '1020304050'
ORDER BY a.fecha_entrega DESC;





/*
-- PRUEBA: DOCUMENTO DUPLICADO
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
    'Cliente',
    'Duplicado',
    '3000000000',
    'cliente.duplicado@example.com',
    'LC-DUPLICADA',
    '2029-01-01',
    'Activo'
);


-- PRUEBA: PLACA DUPLICADA
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
VALUES (
    (
        SELECT id_categoria
        FROM categoria_vehiculo
        WHERE nombre_categoria = 'Compacto'
    ),
    'ABC123',
    'Marca prueba',
    'Modelo prueba',
    2024,
    'Blanco',
    'CHASIS-PRUEBA',
    0,
    'Disponible'
);


-- PRUEBA: VALOR DE PAGO NEGATIVO
INSERT INTO pago (
    id_alquiler,
    valor_pago,
    metodo_pago,
    referencia_pago,
    estado_pago
)
VALUES (
    (
        SELECT MIN(id_alquiler)
        FROM alquiler
    ),
    -50000.00,
    'Efectivo',
    'PAGO-NEGATIVO',
    'Aprobado'
);



-- PRUEBA: FECHA FINAL ANTERIOR A LA INICIAL
INSERT INTO reserva (
    id_cliente,
    id_vehiculo,
    fecha_inicio,
    fecha_fin,
    estado_reserva,
    valor_estimado
)
VALUES (
    (
        SELECT id_cliente
        FROM cliente
        WHERE numero_documento = '1020304050'
    ),
    (
        SELECT id_vehiculo
        FROM vehiculo
        WHERE placa = 'ABC123'
    ),
    '2026-10-10 08:00:00',
    '2026-10-08 18:00:00',
    'Pendiente',
    240000.00
);



-- PRUEBA: INTEGRIDAD REFERENCIAL
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
    (
        SELECT id_vehiculo
        FROM vehiculo
        WHERE placa = 'ABC123'
    ),
    '2026-10-10 08:00:00',
    '2026-10-12 18:00:00',
    'Pendiente',
    240000.00
);



-- PRUEBA: ALQUILER DUPLICADO
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
    id_cliente,
    id_vehiculo,
    NULL,
    fecha_entrega,
    fecha_devolucion_programada,
    fecha_devolucion_real,
    kilometraje_salida,
    kilometraje_entrada,
    nivel_combustible_salida,
    nivel_combustible_entrada,
    valor_total,
    estado_alquiler,
    'Prueba de duplicidad'
FROM alquiler
WHERE id_alquiler = (
    SELECT MIN(id_alquiler)
    FROM alquiler
);

*/


