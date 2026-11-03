SELECT
    tablename AS tabla,
    indexname AS indice,
    indexdef AS definicion
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
      'cliente',
      'categoria_vehiculo',
      'vehiculo',
      'reserva',
      'alquiler',
      'pago',
      'mantenimiento'
  )
ORDER BY tablename, indexname;


ANALYZE public.reserva;
ANALYZE public.vehiculo;

SELECT
    id_vehiculo,
    placa,
    marca,
    modelo
FROM public.vehiculo
WHERE placa = 'NOP234';

------------------Plan de ejecución antes de la estrategia de afinamiento --------------
EXPLAIN (ANALYZE, BUFFERS)
SELECT
    r.id_reserva,
    r.id_vehiculo,
    r.fecha_inicio,
    r.fecha_fin,
    r.estado_reserva
FROM public.reserva AS r
WHERE r.id_vehiculo = (
    SELECT id_vehiculo
    FROM public.vehiculo
    WHERE placa = 'NOP234'
)
AND r.estado_reserva IN ('Pendiente', 'Confirmada')
AND TIMESTAMP '2026-09-06 08:00:00' < r.fecha_fin
AND TIMESTAMP '2026-09-07 18:00:00' > r.fecha_inicio;



--------------------------Creacion del indice -----------------------------

CREATE INDEX idx_reserva_disponibilidad
ON public.reserva (
    id_vehiculo,
    fecha_inicio,
    fecha_fin
)
WHERE estado_reserva IN ('Pendiente', 'Confirmada');



SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname = 'idx_reserva_disponibilidad';



ANALYZE public.reserva;



-----------------------------Plan de ejecución después de crear el índice parcial --------------------

EXPLAIN (ANALYZE, BUFFERS)
SELECT
    r.id_reserva,
    r.id_vehiculo,
    r.fecha_inicio,
    r.fecha_fin,
    r.estado_reserva
FROM public.reserva AS r
WHERE r.id_vehiculo = (
    SELECT id_vehiculo
    FROM public.vehiculo
    WHERE placa = 'NOP234'
)
AND r.estado_reserva IN ('Pendiente', 'Confirmada')
AND TIMESTAMP '2026-09-06 08:00:00' < r.fecha_fin
AND TIMESTAMP '2026-09-07 18:00:00' > r.fecha_inicio;





BEGIN;

SET LOCAL enable_seqscan = off;

EXPLAIN (ANALYZE, BUFFERS)
SELECT
    r.id_reserva,
    r.id_vehiculo,
    r.fecha_inicio,
    r.fecha_fin,
    r.estado_reserva
FROM public.reserva AS r
WHERE r.id_vehiculo = (
    SELECT id_vehiculo
    FROM public.vehiculo
    WHERE placa = 'NOP234'
)
AND r.estado_reserva IN ('Pendiente', 'Confirmada')
AND TIMESTAMP '2026-09-06 08:00:00' < r.fecha_fin
AND TIMESTAMP '2026-09-07 18:00:00' > r.fecha_inicio;

ROLLBACK;
