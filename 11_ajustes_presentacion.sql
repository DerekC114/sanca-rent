-- ============================================================
-- 11. AJUSTES DE PRESENTACIÓN
-- Corrige la ortografía de las descripciones de categoría que
-- se muestran a los clientes en la página web.
-- ============================================================

UPDATE categoria_vehiculo
SET descripcion = 'Vehículo pequeño para recorridos urbanos'
WHERE nombre_categoria = 'Compacto';

UPDATE categoria_vehiculo
SET descripcion = 'Vehículo de pasajeros con mayor espacio'
WHERE nombre_categoria = 'Sedan';

UPDATE categoria_vehiculo
SET descripcion = 'Vehículo amplio para la ciudad'
WHERE nombre_categoria = 'SUV';

UPDATE categoria_vehiculo
SET descripcion = 'Vehículo para transporte de pasajeros o carga'
WHERE nombre_categoria = 'Camioneta';
