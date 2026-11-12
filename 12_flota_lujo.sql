-- ============================================================
-- 12. FLOTA DE LUJO
-- Agrega la categoría Lujo y tres vehículos de alta gama.
-- Tarifa diaria: $5.000.000
-- ============================================================

INSERT INTO categoria_vehiculo (
    nombre_categoria,
    descripcion,
    tarifa_diaria_base,
    deposito_requerido,
    estado_categoria
)
VALUES (
    'Lujo',
    'Vehículos de alta gama y superdeportivos',
    5000000.00,
    30000000.00,
    'Activa'
);

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
    (SELECT id_categoria FROM categoria_vehiculo WHERE nombre_categoria = 'Lujo'),
    'GWG063',
    'Mercedes-Benz',
    'Clase G 63 AMG',
    2025,
    'Rojo',
    'CHASIS-0012',
    3500,
    'Disponible'
),
(
    (SELECT id_categoria FROM categoria_vehiculo WHERE nombre_categoria = 'Lujo'),
    'REV012',
    'Lamborghini',
    'Revuelto',
    2025,
    'Gris',
    'CHASIS-0013',
    1200,
    'Disponible'
),
(
    (SELECT id_categoria FROM categoria_vehiculo WHERE nombre_categoria = 'Lujo'),
    'URS666',
    'Lamborghini',
    'Urus SE',
    2025,
    'Negro',
    'CHASIS-0014',
    2800,
    'Disponible'
);
