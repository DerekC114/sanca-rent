SELECT
    current_user AS usuario_conectado,
    current_database() AS base_datos,
    current_schema() AS esquema;


-------------------PREUBA USUARIO CONSULTA ---------------------------------
SELECT
    placa,
    marca,
    modelo,
    estado_vehiculo
FROM public.vehiculo
ORDER BY placa;

SELECT COUNT(*) AS cantidad_vehiculos
FROM public.vehiculo;


UPDATE public.vehiculo
SET color = 'Verde'
WHERE placa = 'ABC123';



----------------------PRUEBA USUARIO OPERADOR -------------------------------

SELECT *
FROM public.vehiculo;


INSERT INTO public.pago (
    id_alquiler,
    valor_pago,
    metodo_pago,
    referencia_pago,
    estado_pago
)
VALUES (
    (SELECT MIN(id_alquiler) FROM public.alquiler),
    10000,
    'Efectivo',
    'PRUEBA-OPERADOR-PAGO',
    'Aprobado'
);


-------------------PRUEBA USUARIO CONTABILIDAD---------------------------------

SELECT *
FROM public.pago;

UPDATE public.vehiculo
SET color = 'Verde'
WHERE placa = 'ABC123';


--------------------PRUEBA USUARIO MANTENIMIENTO ---------------------------------


SELECT *
FROM public.mantenimiento;

UPDATE public.vehiculo
SET placa = 'ZZZ999'
WHERE placa = 'ABC123';


-------------------------PRUEBA USUARIO ADMINISTRADOR-----------------------------

SELECT *
FROM public.cliente;


BEGIN;

UPDATE public.categoria_vehiculo
SET descripcion = descripcion || ' - prueba'
WHERE nombre_categoria = 'Compacto';

SELECT nombre_categoria, descripcion
FROM public.categoria_vehiculo
WHERE nombre_categoria = 'Compacto';

ROLLBACK;







-------------- PRUEBA DE SEGURIDAD  ----------------------

SELECT
    placa,
    marca,
    modelo,
    estado_vehiculo
FROM public.vehiculo
ORDER BY placa;

UPDATE public.vehiculo
SET color = 'Verde'
WHERE placa = 'ABC123';
