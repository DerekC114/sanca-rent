
-- 1. TABLA CLIENTE
-------------------------------------------------------------

CREATE TABLE cliente (
    id_cliente INTEGER GENERATED ALWAYS AS IDENTITY,

    tipo_documento VARCHAR(20) NOT NULL,
    numero_documento VARCHAR(20) NOT NULL,
    nombres VARCHAR(60) NOT NULL,
    apellidos VARCHAR(60) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    correo_electronico VARCHAR(100) NOT NULL,
    numero_licencia VARCHAR(30) NOT NULL,
    fecha_vencimiento_licencia DATE NOT NULL,
    direccion VARCHAR(150),
    estado_cliente VARCHAR(20) NOT NULL DEFAULT 'Activo',

    CONSTRAINT pk_cliente
        PRIMARY KEY (id_cliente),

    CONSTRAINT uq_cliente_documento
        UNIQUE (numero_documento),

    CONSTRAINT uq_cliente_correo
        UNIQUE (correo_electronico),

    CONSTRAINT uq_cliente_licencia
        UNIQUE (numero_licencia),

    CONSTRAINT ck_cliente_tipo_documento
        CHECK (
            tipo_documento IN (
                'Cedula',
                'Cedula extranjeria',
                'Pasaporte'
            )
        ),

    CONSTRAINT ck_cliente_estado
        CHECK (
            estado_cliente IN (
                'Activo',
                'Inactivo',
                'Bloqueado'
            )
        )
);



-- 2. TABLA CATEGORIA DE VEHICULO
----------------------------------------------

CREATE TABLE categoria_vehiculo (
    id_categoria INTEGER GENERATED ALWAYS AS IDENTITY,

    nombre_categoria VARCHAR(50) NOT NULL,
    descripcion VARCHAR(200),
    tarifa_diaria_base NUMERIC(12,2) NOT NULL,
    deposito_requerido NUMERIC(12,2),
    estado_categoria VARCHAR(20) NOT NULL DEFAULT 'Activa',

    CONSTRAINT pk_categoria_vehiculo
        PRIMARY KEY (id_categoria),

    CONSTRAINT uq_categoria_nombre
        UNIQUE (nombre_categoria),

    CONSTRAINT ck_categoria_tarifa
        CHECK (tarifa_diaria_base > 0),

    CONSTRAINT ck_categoria_deposito
        CHECK (
            deposito_requerido IS NULL
            OR deposito_requerido >= 0
        ),

    CONSTRAINT ck_categoria_estado
        CHECK (
            estado_categoria IN (
                'Activa',
                'Inactiva'
            )
        )
);



-- 3. TABLA VEHICULO
---------------------------------------------------------

CREATE TABLE vehiculo (
    id_vehiculo INTEGER GENERATED ALWAYS AS IDENTITY,

    id_categoria INTEGER NOT NULL,
    placa VARCHAR(10) NOT NULL,
    marca VARCHAR(40) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    anio SMALLINT NOT NULL,
    color VARCHAR(30) NOT NULL,
    numero_chasis VARCHAR(50) NOT NULL,
    kilometraje INTEGER NOT NULL DEFAULT 0,
    estado_vehiculo VARCHAR(30) NOT NULL DEFAULT 'Disponible',

    CONSTRAINT pk_vehiculo
        PRIMARY KEY (id_vehiculo),

    CONSTRAINT uq_vehiculo_placa
        UNIQUE (placa),

    CONSTRAINT uq_vehiculo_chasis
        UNIQUE (numero_chasis),

    CONSTRAINT fk_vehiculo_categoria
        FOREIGN KEY (id_categoria)
        REFERENCES categoria_vehiculo (id_categoria)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT ck_vehiculo_anio
        CHECK (anio BETWEEN 1980 AND 2100),

    CONSTRAINT ck_vehiculo_kilometraje
        CHECK (kilometraje >= 0),

    CONSTRAINT ck_vehiculo_estado
        CHECK (
            estado_vehiculo IN (
                'Disponible',
                'Reservado',
                'Alquilado',
                'En mantenimiento',
                'Fuera de servicio'
            )
        )
);



-- 4. TABLA RESERVA
-------------------------------------------------------------------------

CREATE TABLE reserva (
    id_reserva INTEGER GENERATED ALWAYS AS IDENTITY,

    id_cliente INTEGER NOT NULL,
    id_vehiculo INTEGER NOT NULL,

    fecha_reserva TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP NOT NULL,

    estado_reserva VARCHAR(20) NOT NULL DEFAULT 'Pendiente',
    valor_estimado NUMERIC(12,2) NOT NULL,
    observaciones VARCHAR(250),

    CONSTRAINT pk_reserva
        PRIMARY KEY (id_reserva),

    CONSTRAINT fk_reserva_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES cliente (id_cliente)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_reserva_vehiculo
        FOREIGN KEY (id_vehiculo)
        REFERENCES vehiculo (id_vehiculo)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT ck_reserva_fechas
        CHECK (fecha_fin > fecha_inicio),

    CONSTRAINT ck_reserva_valor
        CHECK (valor_estimado > 0),

    CONSTRAINT ck_reserva_estado
        CHECK (
            estado_reserva IN (
                'Pendiente',
                'Confirmada',
                'Cumplida',
                'Cancelada',
                'Vencida'
            )
        )
);



-- 5. TABLA ALQUILER
----------------------------------------------------------------------

CREATE TABLE alquiler (
    id_alquiler INTEGER GENERATED ALWAYS AS IDENTITY,

    id_cliente INTEGER NOT NULL,
    id_vehiculo INTEGER NOT NULL,
    id_reserva INTEGER,

    fecha_entrega TIMESTAMP NOT NULL,
    fecha_devolucion_programada TIMESTAMP NOT NULL,
    fecha_devolucion_real TIMESTAMP,

    kilometraje_salida INTEGER NOT NULL,
    kilometraje_entrada INTEGER,

    nivel_combustible_salida NUMERIC(5,2) NOT NULL,
    nivel_combustible_entrada NUMERIC(5,2),

    valor_total NUMERIC(12,2) NOT NULL,
    estado_alquiler VARCHAR(20) NOT NULL DEFAULT 'Activo',
    observaciones VARCHAR(250),

    CONSTRAINT pk_alquiler
        PRIMARY KEY (id_alquiler),

    CONSTRAINT uq_alquiler_reserva
        UNIQUE (id_reserva),

    CONSTRAINT fk_alquiler_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES cliente (id_cliente)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_alquiler_vehiculo
        FOREIGN KEY (id_vehiculo)
        REFERENCES vehiculo (id_vehiculo)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_alquiler_reserva
        FOREIGN KEY (id_reserva)
        REFERENCES reserva (id_reserva)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT ck_alquiler_fechas_programadas
        CHECK (
            fecha_devolucion_programada > fecha_entrega
        ),

    CONSTRAINT ck_alquiler_fecha_real
        CHECK (
            fecha_devolucion_real IS NULL
            OR fecha_devolucion_real >= fecha_entrega
        ),

    CONSTRAINT ck_alquiler_kilometraje_salida
        CHECK (kilometraje_salida >= 0),

    CONSTRAINT ck_alquiler_kilometraje_entrada
        CHECK (
            kilometraje_entrada IS NULL
            OR kilometraje_entrada >= kilometraje_salida
        ),

    CONSTRAINT ck_alquiler_combustible_salida
        CHECK (
            nivel_combustible_salida
            BETWEEN 0 AND 100
        ),

    CONSTRAINT ck_alquiler_combustible_entrada
        CHECK (
            nivel_combustible_entrada IS NULL
            OR nivel_combustible_entrada
               BETWEEN 0 AND 100
        ),

    CONSTRAINT ck_alquiler_valor
        CHECK (valor_total > 0),

    CONSTRAINT ck_alquiler_estado
        CHECK (
            estado_alquiler IN (
                'Activo',
                'Finalizado',
                'Cancelado',
                'Atrasado'
            )
        )
);



-- 6. TABLA PAGO
--------------------------------------------------------------------

CREATE TABLE pago (
    id_pago INTEGER GENERATED ALWAYS AS IDENTITY,

    id_alquiler INTEGER NOT NULL,
    fecha_pago TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valor_pago NUMERIC(12,2) NOT NULL,
    metodo_pago VARCHAR(30) NOT NULL,
    referencia_pago VARCHAR(50),
    estado_pago VARCHAR(20) NOT NULL DEFAULT 'Aprobado',

    CONSTRAINT pk_pago
        PRIMARY KEY (id_pago),

    CONSTRAINT uq_pago_referencia
        UNIQUE (referencia_pago),

    CONSTRAINT fk_pago_alquiler
        FOREIGN KEY (id_alquiler)
        REFERENCES alquiler (id_alquiler)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT ck_pago_valor
        CHECK (valor_pago > 0),

    CONSTRAINT ck_pago_metodo
        CHECK (
            metodo_pago IN (
                'Efectivo',
                'Tarjeta',
                'Transferencia'
            )
        ),

    CONSTRAINT ck_pago_estado
        CHECK (
            estado_pago IN (
                'Pendiente',
                'Aprobado',
                'Rechazado',
                'Anulado'
            )
        )
);



-- 7. TABLA MANTENIMIENTO
------------------------------------------------------------------------

CREATE TABLE mantenimiento (
    id_mantenimiento INTEGER GENERATED ALWAYS AS IDENTITY,

    id_vehiculo INTEGER NOT NULL,
    tipo_mantenimiento VARCHAR(20) NOT NULL,
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP,
    descripcion VARCHAR(250) NOT NULL,
    costo NUMERIC(12,2) NOT NULL DEFAULT 0,
    kilometraje_mantenimiento INTEGER NOT NULL,
    estado_mantenimiento VARCHAR(20) NOT NULL DEFAULT 'Programado',
    taller_responsable VARCHAR(100),

    CONSTRAINT pk_mantenimiento
        PRIMARY KEY (id_mantenimiento),

    CONSTRAINT fk_mantenimiento_vehiculo
        FOREIGN KEY (id_vehiculo)
        REFERENCES vehiculo (id_vehiculo)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT ck_mantenimiento_tipo
        CHECK (
            tipo_mantenimiento IN (
                'Preventivo',
                'Correctivo'
            )
        ),

    CONSTRAINT ck_mantenimiento_fechas
        CHECK (
            fecha_fin IS NULL
            OR fecha_fin >= fecha_inicio
        ),

    CONSTRAINT ck_mantenimiento_costo
        CHECK (costo >= 0),

    CONSTRAINT ck_mantenimiento_kilometraje
        CHECK (kilometraje_mantenimiento >= 0),

    CONSTRAINT ck_mantenimiento_estado
        CHECK (
            estado_mantenimiento IN (
                'Programado',
                'En proceso',
                'Finalizado',
                'Cancelado'
            )
        )
);



-- 8. INDICES PARA MEJORAR BUSQUEDAS FRECUENTES
--------------------------------------------------------

CREATE INDEX idx_reserva_cliente
    ON reserva (id_cliente);

CREATE INDEX idx_reserva_vehiculo
    ON reserva (id_vehiculo);

CREATE INDEX idx_reserva_fechas
    ON reserva (fecha_inicio, fecha_fin);

CREATE INDEX idx_alquiler_cliente
    ON alquiler (id_cliente);

CREATE INDEX idx_alquiler_vehiculo
    ON alquiler (id_vehiculo);

CREATE INDEX idx_pago_alquiler
    ON pago (id_alquiler);

CREATE INDEX idx_mantenimiento_vehiculo
    ON mantenimiento (id_vehiculo);



-- 9. COMPROBACION FINAL
--------------------------------------------------------

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;