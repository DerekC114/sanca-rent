-- ============================================================
-- 09. REGLAS DE NEGOCIO AUTOMATIZADAS
-- Implementa en la base de datos las reglas 6, 12, 13, 18, 19 y 20
-- del documento (y la oportunidad de mejora de las conclusiones:
-- "automatizar reglas como la prevención de reservas superpuestas").
-- Las funciones son SECURITY DEFINER para que el cambio de estado del
-- vehículo ocurra aunque el rol que opera no tenga UPDATE sobre vehiculo.
-- ============================================================

-- ------------------------------------------------------------
-- Disponibilidad de vehículos en un periodo
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_vehiculo_disponible(
    p_id_vehiculo INTEGER,
    p_inicio TIMESTAMP,
    p_fin TIMESTAMP,
    p_excluir_reserva INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        -- Regla 12: no se reserva ni alquila un vehículo en mantenimiento o fuera de servicio
        (SELECT estado_vehiculo FROM vehiculo WHERE id_vehiculo = p_id_vehiculo)
            NOT IN ('En mantenimiento', 'Fuera de servicio')
        -- Regla 6: sin reservas activas que se crucen en fechas
        AND NOT EXISTS (
            SELECT 1 FROM reserva r
            WHERE r.id_vehiculo = p_id_vehiculo
              AND r.estado_reserva IN ('Pendiente', 'Confirmada')
              AND r.id_reserva IS DISTINCT FROM p_excluir_reserva
              AND r.fecha_inicio < p_fin
              AND r.fecha_fin > p_inicio
        )
        -- Regla 13: sin alquileres activos que se crucen; un alquiler vencido bloquea hasta su devolución
        AND NOT EXISTS (
            SELECT 1 FROM alquiler a
            WHERE a.id_vehiculo = p_id_vehiculo
              AND a.estado_alquiler IN ('Activo', 'Atrasado')
              AND a.fecha_entrega < p_fin
              AND (a.fecha_devolucion_programada > p_inicio
                   OR a.fecha_devolucion_programada < LOCALTIMESTAMP)  -- vencido y sin devolver
        )
        -- Sin mantenimientos programados o en proceso en el periodo
        AND NOT EXISTS (
            SELECT 1 FROM mantenimiento m
            WHERE m.id_vehiculo = p_id_vehiculo
              AND m.estado_mantenimiento IN ('Programado', 'En proceso')
              AND m.fecha_inicio < p_fin
              AND COALESCE(m.fecha_fin, 'infinity'::timestamp) > p_inicio
        );
$$;


-- ------------------------------------------------------------
-- RESERVA: validaciones antes de guardar
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validar_reserva()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cliente cliente%ROWTYPE;
BEGIN
    IF NEW.estado_reserva NOT IN ('Pendiente', 'Confirmada') THEN
        RETURN NEW;
    END IF;

    -- Al confirmar o cancelar sin cambiar vehículo ni fechas no se revalida
    IF TG_OP = 'UPDATE'
       AND OLD.estado_reserva IN ('Pendiente', 'Confirmada')
       AND NEW.id_vehiculo = OLD.id_vehiculo
       AND NEW.fecha_inicio = OLD.fecha_inicio
       AND NEW.fecha_fin = OLD.fecha_fin THEN
        RETURN NEW;
    END IF;

    SELECT * INTO v_cliente FROM cliente WHERE id_cliente = NEW.id_cliente;
    IF v_cliente.estado_cliente <> 'Activo' THEN
        RAISE EXCEPTION 'El cliente está %; no puede hacer reservas.', lower(v_cliente.estado_cliente)
            USING ERRCODE = 'check_violation';
    END IF;
    IF v_cliente.fecha_vencimiento_licencia < NEW.fecha_fin::date THEN
        RAISE EXCEPTION 'La licencia de conducción vence el % , antes de terminar la reserva.', v_cliente.fecha_vencimiento_licencia
            USING ERRCODE = 'check_violation';
    END IF;

    IF NOT fn_vehiculo_disponible(NEW.id_vehiculo, NEW.fecha_inicio, NEW.fecha_fin, NEW.id_reserva) THEN
        RAISE EXCEPTION 'El vehículo no está disponible entre % y %.', NEW.fecha_inicio, NEW.fecha_fin
            USING ERRCODE = 'exclusion_violation';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_validar_reserva ON reserva;
CREATE TRIGGER tg_validar_reserva
    BEFORE INSERT OR UPDATE ON reserva
    FOR EACH ROW EXECUTE FUNCTION fn_validar_reserva();


-- ------------------------------------------------------------
-- ALQUILER: validaciones y cambio de estado del vehículo
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validar_alquiler()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_estado_cliente VARCHAR(20);
BEGIN
    IF TG_OP = 'INSERT' AND NEW.estado_alquiler IN ('Activo', 'Atrasado') THEN
        SELECT estado_cliente INTO v_estado_cliente FROM cliente WHERE id_cliente = NEW.id_cliente;
        IF v_estado_cliente <> 'Activo' THEN
            RAISE EXCEPTION 'El cliente está %; no puede alquilar.', lower(v_estado_cliente)
                USING ERRCODE = 'check_violation';
        END IF;

        IF NOT fn_vehiculo_disponible(NEW.id_vehiculo, NEW.fecha_entrega, NEW.fecha_devolucion_programada, NEW.id_reserva) THEN
            RAISE EXCEPTION 'El vehículo no está disponible para ese periodo (regla 13: un vehículo no puede tener dos alquileres activos).'
                USING ERRCODE = 'exclusion_violation';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_validar_alquiler ON alquiler;
CREATE TRIGGER tg_validar_alquiler
    BEFORE INSERT ON alquiler
    FOR EACH ROW EXECUTE FUNCTION fn_validar_alquiler();


CREATE OR REPLACE FUNCTION fn_estado_por_alquiler()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Regla 18: al iniciar un alquiler el vehículo pasa a Alquilado
    IF NEW.estado_alquiler IN ('Activo', 'Atrasado')
       AND (TG_OP = 'INSERT' OR OLD.estado_alquiler NOT IN ('Activo', 'Atrasado')) THEN
        UPDATE vehiculo SET estado_vehiculo = 'Alquilado' WHERE id_vehiculo = NEW.id_vehiculo;
        IF NEW.id_reserva IS NOT NULL THEN
            UPDATE reserva SET estado_reserva = 'Cumplida' WHERE id_reserva = NEW.id_reserva;
        END IF;
    END IF;

    -- Regla 20: al terminar el alquiler el vehículo vuelve a Disponible
    IF TG_OP = 'UPDATE'
       AND OLD.estado_alquiler IN ('Activo', 'Atrasado')
       AND NEW.estado_alquiler IN ('Finalizado', 'Cancelado') THEN
        UPDATE vehiculo
        SET kilometraje = GREATEST(kilometraje, COALESCE(NEW.kilometraje_entrada, kilometraje)),
            estado_vehiculo = CASE
                WHEN estado_vehiculo IN ('En mantenimiento', 'Fuera de servicio') THEN estado_vehiculo
                ELSE 'Disponible'
            END
        WHERE id_vehiculo = NEW.id_vehiculo;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_estado_por_alquiler ON alquiler;
CREATE TRIGGER tg_estado_por_alquiler
    AFTER INSERT OR UPDATE OF estado_alquiler ON alquiler
    FOR EACH ROW EXECUTE FUNCTION fn_estado_por_alquiler();


-- ------------------------------------------------------------
-- MANTENIMIENTO: cambio de estado del vehículo
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_estado_por_mantenimiento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Regla 19: al iniciar un mantenimiento el vehículo pasa a En mantenimiento
    IF NEW.estado_mantenimiento = 'En proceso'
       AND (TG_OP = 'INSERT' OR OLD.estado_mantenimiento <> 'En proceso') THEN
        IF EXISTS (SELECT 1 FROM alquiler
                   WHERE id_vehiculo = NEW.id_vehiculo
                     AND estado_alquiler IN ('Activo', 'Atrasado')) THEN
            RAISE EXCEPTION 'El vehículo está alquilado; registre la devolución antes de iniciar el mantenimiento.'
                USING ERRCODE = 'check_violation';
        END IF;
        UPDATE vehiculo SET estado_vehiculo = 'En mantenimiento' WHERE id_vehiculo = NEW.id_vehiculo;
    END IF;

    -- Regla 20: al terminar el mantenimiento el vehículo vuelve a Disponible
    IF TG_OP = 'UPDATE'
       AND OLD.estado_mantenimiento = 'En proceso'
       AND NEW.estado_mantenimiento IN ('Finalizado', 'Cancelado') THEN
        UPDATE vehiculo
        SET kilometraje = GREATEST(kilometraje, NEW.kilometraje_mantenimiento),
            estado_vehiculo = CASE WHEN estado_vehiculo = 'En mantenimiento' THEN 'Disponible' ELSE estado_vehiculo END
        WHERE id_vehiculo = NEW.id_vehiculo;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_estado_por_mantenimiento ON mantenimiento;
CREATE TRIGGER tg_estado_por_mantenimiento
    AFTER INSERT OR UPDATE OF estado_mantenimiento ON mantenimiento
    FOR EACH ROW EXECUTE FUNCTION fn_estado_por_mantenimiento();


-- ------------------------------------------------------------
-- Comprobación
-- ------------------------------------------------------------
SELECT event_object_table AS tabla, trigger_name AS trigger, action_timing AS momento
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
