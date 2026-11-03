-- ============================================================
-- 10. VALIDACIONES DE FORMATO PARA LOS DATOS DEL CLIENTE
-- Restricciones CHECK que impiden guardar datos mal escritos,
-- aunque se intente insertarlos sin pasar por el formulario.
-- ============================================================

ALTER TABLE cliente
    DROP CONSTRAINT IF EXISTS ck_cliente_numero_documento,
    DROP CONSTRAINT IF EXISTS ck_cliente_nombres,
    DROP CONSTRAINT IF EXISTS ck_cliente_apellidos,
    DROP CONSTRAINT IF EXISTS ck_cliente_telefono,
    DROP CONSTRAINT IF EXISTS ck_cliente_correo,
    DROP CONSTRAINT IF EXISTS ck_cliente_licencia,
    DROP CONSTRAINT IF EXISTS ck_cliente_direccion;

ALTER TABLE cliente
    -- La cédula solo admite números (6 a 10 dígitos);
    -- la cédula de extranjería y el pasaporte, letras mayúsculas y números (6 a 12)
    ADD CONSTRAINT ck_cliente_numero_documento CHECK (
        (tipo_documento = 'Cedula' AND numero_documento ~ '^[0-9]{6,10}$')
        OR (tipo_documento IN ('Cedula extranjeria', 'Pasaporte') AND numero_documento ~ '^[A-Z0-9]{6,12}$')
    ),

    -- Nombres y apellidos: letras (con tildes y ñ), espacios, apóstrofo o guion
    ADD CONSTRAINT ck_cliente_nombres CHECK (
        nombres ~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]([A-Za-zÁÉÍÓÚÜÑáéíóúüñ'' -]*[A-Za-zÁÉÍÓÚÜÑáéíóúüñ])?$'
        AND char_length(nombres) >= 2
    ),
    ADD CONSTRAINT ck_cliente_apellidos CHECK (
        apellidos ~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]([A-Za-zÁÉÍÓÚÜÑáéíóúüñ'' -]*[A-Za-zÁÉÍÓÚÜÑáéíóúüñ])?$'
        AND char_length(apellidos) >= 2
    ),

    -- Teléfono colombiano: celular (3 + 9 dígitos) o fijo (60 + 8 dígitos)
    ADD CONSTRAINT ck_cliente_telefono CHECK (telefono ~ '^(3[0-9]{9}|60[0-9]{8})$'),

    -- Correo con formato usuario@dominio.ext
    ADD CONSTRAINT ck_cliente_correo CHECK (
        correo_electronico ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),

    -- Licencia: letras mayúsculas, números y guion
    ADD CONSTRAINT ck_cliente_licencia CHECK (numero_licencia ~ '^[A-Z0-9-]{5,30}$'),

    -- Dirección opcional: si se escribe, al menos 3 caracteres
    ADD CONSTRAINT ck_cliente_direccion CHECK (direccion IS NULL OR char_length(btrim(direccion)) >= 3);

-- Comprobación
SELECT conname AS restriccion, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid = 'cliente'::regclass AND contype = 'c'
ORDER BY conname;
