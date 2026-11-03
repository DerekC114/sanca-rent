insert into categoria_vehiculo(
	nombre_categoria,
	descripcion,
	tarifa_diaria_base,
	deposito_requerido,
	estado_categoria
	
)
values (
	'Compacto',
	'Vehiculo pequeno para recorridos urbanos',
	120000.00,
	300000.00,
	'Activa'
);


select * from categoria_vehiculo;

insert into categoria_vehiculo (
	nombre_categoria,
	descripcion,
	tarifa_diaria_base,
	deposito_requerido,
	estado_categoria
)
values(
	'Sedan',
	'vehiculo de pasajeros con mayor espacio',
	160000.00,
	400000.00,
	'Activa'
),
(
	'SUV',
	'vehiculo ampliopara ciudad',
	220000.00,
	600000.00,
	'Activa'
);

select * from categoria_vehiculo order by id_categoria;

SELECT id_categoria,
    nombre_categoria
from categoria_vehiculo
ORDER BY id_categoria;

INSERT INTO categoria_vehiculo (
    nombre_categoria,
    descripcion,
    tarifa_diaria_base,
    deposito_requerido,
    estado_categoria
)
VALUES (
    'Camioneta',
    'Vehiculo para transporte de pasajeros o carga',
    280000.00,
    800000.00,
    'Activa'
);

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
    '1020304050',
    'Laura',
    'Gomez Rodriguez',
    '3104567890',
    'laura.gomez@example.com',
    'LC-10001',
    '2028-07-15',
    'Bogota',
    'Activo'
),
(
    'Cedula',
    '1030405060',
    'Carlos',
    'Perez Martinez',
    '3115678901',
    'carlos.perez@example.com',
    'LC-10002',
    '2027-11-20',
    'Bogota',
    'Activo'
),
(
    'Cedula',
    '1040506070',
    'Andrea',
    'Torres Sanchez',
    '3126789012',
    'andrea.torres@example.com',
    'LC-10003',
    '2029-03-10',
    'Soacha',
    'Activo'
),
(
    'Pasaporte',
    'PA908070',
    'Daniel',
    'Mendoza Castro',
    '3137890123',
    'daniel.mendoza@example.com',
    'LC-10004',
    '2028-09-30',
    'Bogota',
    'Activo'
),
(
    'Cedula extranjeria',
    'CE50607080',
    'Sofia',
    'Ramirez Lopez',
    '3148901234',
    'sofia.ramirez@example.com',
    'LC-10005',
    '2027-05-18',
    'Chia',
    'Inactivo'
);

SELECT
    id_cliente,
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
FROM cliente
ORDER BY id_cliente;

UPDATE cliente
	set correo_electronico = 'laura.gomez@gmail.com'
	where numero_documento = '1020304050';
	
select * from cliente;

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
    (SELECT id_categoria
     FROM categoria_vehiculo
     WHERE nombre_categoria = 'Compacto'),
    'ABC123',
    'Renault',
    'Sandero',
    2023,
    'Blanco',
    'CHASIS-0001',
    25000,
    'Disponible'
),
(
    (SELECT id_categoria
     FROM categoria_vehiculo
     WHERE nombre_categoria = 'Compacto'),
    'DEF456',
    'Chevrolet',
    'Onix',
    2024,
    'Gris',
    'CHASIS-0002',
    15000,
    'Disponible'
),
(
    (SELECT id_categoria
     FROM categoria_vehiculo
     WHERE nombre_categoria = 'Sedan'),
    'GHI789',
    'Toyota',
    'Corolla',
    2023,
    'Negro',
    'CHASIS-0003',
    30000,
    'Alquilado'
),
(
    (SELECT id_categoria
     FROM categoria_vehiculo
     WHERE nombre_categoria = 'Sedan'),
    'JKL234',
    'Mazda',
    'Mazda 3',
    2024,
    'Rojo',
    'CHASIS-0004',
    12000,
    'Disponible'
),
(
    (SELECT id_categoria
     FROM categoria_vehiculo
     WHERE nombre_categoria = 'SUV'),
    'MNO567',
    'Kia',
    'Sportage',
    2022,
    'Azul',
    'CHASIS-0005',
    45000,
    'En mantenimiento'
),
(
    (SELECT id_categoria
     FROM categoria_vehiculo
     WHERE nombre_categoria = 'SUV'),
    'PQR890',
    'Renault',
    'Duster',
    2023,
    'Plata',
    'CHASIS-0006',
    28000,
    'Disponible'
),
(
    (SELECT id_categoria
     FROM categoria_vehiculo
     WHERE nombre_categoria = 'Camioneta'),
    'STU345',
    'Toyota',
    'Hilux',
    2022,
    'Blanco',
    'CHASIS-0007',
    55000,
    'Disponible'
),
(
    (SELECT id_categoria
     FROM categoria_vehiculo
     WHERE nombre_categoria = 'Camioneta'),
    'VWX678',
    'Ford',
    'Ranger',
    2023,
    'Negro',
    'CHASIS-0008',
    38000,
    'Fuera de servicio'
);

select * from vehiculo;

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
        WHERE placa = 'MNO567'
    ),
    'Correctivo',
    '2026-08-22 08:00:00',
    NULL,
    'Revision y reparacion del sistema de frenos',
    850000.00,
    45000,
    'En proceso',
    'Taller Automotriz Central'
),
(
    (
        SELECT id_vehiculo
        FROM vehiculo
        WHERE placa = 'ABC123'
    ),
    'Preventivo',
    '2026-07-10 08:00:00',
    '2026-07-10 15:00:00',
    'Cambio de aceite y filtros',
    280000.00,
    24000,
    'Finalizado',
    'Centro de Servicio Norte'
),
(
    (
        SELECT id_vehiculo
        FROM vehiculo
        WHERE placa = 'STU345'
    ),
    'Preventivo',
    '2026-07-20 09:00:00',
    '2026-07-20 17:00:00',
    'Revision general de los 50000 kilometros',
    620000.00,
    50000,
    'Finalizado',
    'Servicio Toyota'
);

select * from mantenimiento;


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
        WHERE numero_documento = '1020304050'
    ),
    (
        SELECT id_vehiculo
        FROM vehiculo
        WHERE placa = 'ABC123'
    ),
    '2026-08-20 10:00:00',
    '2026-09-01 08:00:00',
    '2026-09-04 18:00:00',
    'Confirmada',
    360000.00,
    'Reserva para viaje familiar'
),
(
    (
        SELECT id_cliente
        FROM cliente
        WHERE numero_documento = '1030405060'
    ),
    (
        SELECT id_vehiculo
        FROM vehiculo
        WHERE placa = 'JKL234'
    ),
    '2026-08-21 14:30:00',
    '2026-09-10 09:00:00',
    '2026-09-12 17:00:00',
    'Pendiente',
    320000.00,
    'Pendiente de confirmacion'
),
(
    (
        SELECT id_cliente
        FROM cliente
        WHERE numero_documento = '1040506070'
    ),
    (
        SELECT id_vehiculo
        FROM vehiculo
        WHERE placa = 'PQR890'
    ),
    '2026-08-22 11:00:00',
    '2026-09-15 07:00:00',
    '2026-09-18 19:00:00',
    'Confirmada',
    660000.00,
    'Uso para desplazamiento fuera de la ciudad'
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
        WHERE placa = 'DEF456'
    ),
    '2026-08-23 16:00:00',
    '2026-09-20 08:00:00',
    '2026-09-21 18:00:00',
    'Cancelada',
    120000.00,
    'Cancelada por solicitud del cliente'
);

select * from reserva;

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
        WHERE numero_documento = '1030405060'
    ),
    (
        SELECT id_vehiculo
        FROM vehiculo
        WHERE placa = 'GHI789'
    ),
    NULL,
    '2026-08-24 08:00:00',
    '2026-08-28 18:00:00',
    NULL,
    30000,
    NULL,
    100.00,
    NULL,
    640000.00,
    'Activo',
    'Alquiler directo sin reserva previa'
),
(
    (
        SELECT id_cliente
        FROM cliente
        WHERE numero_documento = '1020304050'
    ),
    (
        SELECT id_vehiculo
        FROM vehiculo
        WHERE placa = 'DEF456'
    ),
    NULL,
    '2026-08-10 09:00:00',
    '2026-08-12 17:00:00',
    '2026-08-12 16:30:00',
    14500,
    14980,
    100.00,
    75.00,
    240000.00,
    'Finalizado',
    'Vehiculo devuelto sin novedades'
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
        WHERE placa = 'STU345'
    ),
    NULL,
    '2026-08-15 07:30:00',
    '2026-08-18 18:00:00',
    '2026-08-18 17:45:00',
    54000,
    55200,
    100.00,
    90.00,
    840000.00,
    'Finalizado',
    'Alquiler para viaje empresarial'
);

select * from alquiler;

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
            ON a.id_cliente = c.id_cliente
        INNER JOIN vehiculo AS v
            ON a.id_vehiculo = v.id_vehiculo
        WHERE c.numero_documento = '1030405060'
          AND v.placa = 'GHI789'
          AND a.fecha_entrega = '2026-08-24 08:00:00'
    ),
    '2026-08-24 08:10:00',
    320000.00,
    'Tarjeta',
    'PAGO-2026-001',
    'Aprobado'
),
(
    (
        SELECT a.id_alquiler
        FROM alquiler AS a
        INNER JOIN cliente AS c
            ON a.id_cliente = c.id_cliente
        INNER JOIN vehiculo AS v
            ON a.id_vehiculo = v.id_vehiculo
        WHERE c.numero_documento = '1030405060'
          AND v.placa = 'GHI789'
          AND a.fecha_entrega = '2026-08-24 08:00:00'
    ),
    '2026-08-24 08:15:00',
    320000.00,
    'Transferencia',
    'PAGO-2026-002',
    'Aprobado'
),
(
    (
        SELECT a.id_alquiler
        FROM alquiler AS a
        INNER JOIN cliente AS c
            ON a.id_cliente = c.id_cliente
        INNER JOIN vehiculo AS v
            ON a.id_vehiculo = v.id_vehiculo
        WHERE c.numero_documento = '1020304050'
          AND v.placa = 'DEF456'
          AND a.fecha_entrega = '2026-08-10 09:00:00'
    ),
    '2026-08-10 09:10:00',
    240000.00,
    'Tarjeta',
    'PAGO-2026-003',
    'Aprobado'
),
(
    (
        SELECT a.id_alquiler
        FROM alquiler AS a
        INNER JOIN cliente AS c
            ON a.id_cliente = c.id_cliente
        INNER JOIN vehiculo AS v
            ON a.id_vehiculo = v.id_vehiculo
        WHERE c.numero_documento = 'PA908070'
          AND v.placa = 'STU345'
          AND a.fecha_entrega = '2026-08-15 07:30:00'
    ),
    '2026-08-15 07:40:00',
    840000.00,
    'Transferencia',
    'PAGO-2026-004',
    'Aprobado'
);

