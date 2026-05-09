-- ============================================================
-- MEDISTOCK: Funciones SQL para ejecutar en Supabase
-- Panel: SQL Editor → pega este código y ejecuta
-- ============================================================

-- 1. FUNCIÓN: Descontar stock al completar un pedido
--    Llamada desde checkout.js con supabase.rpc('descontar_stock', ...)
CREATE OR REPLACE FUNCTION descontar_stock(p_producto_id INT, p_cantidad INT)
RETURNS VOID AS $$
BEGIN
    UPDATE inventario_detalle
    SET cantidad_disponible = cantidad_disponible - p_cantidad
    WHERE id_producto = p_producto_id
      AND cantidad_disponible >= p_cantidad;

    -- Si no actualizó nada, lanzar error
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Stock insuficiente para el producto %', p_producto_id;
    END IF;
END;
$$ LANGUAGE plpgsql;


-- 2. FUNCIÓN: Agregar columna metodo_pago a la tabla pedidos si no existe
--    Ejecutar una sola vez
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(50);


-- 3. VISTA (opcional): Pedidos con detalle de productos
--    Útil para reportes en el dashboard
CREATE OR REPLACE VIEW vista_pedidos_detalle AS
SELECT
    p.id_pedido,
    p.estado_pedido,
    p.total_pago,
    p.metodo_pago,
    p.created_at,
    dp.cantidad,
    dp.precio_unitario,
    pr.nombre AS producto_nombre
FROM pedidos p
LEFT JOIN detalle_pedidos dp ON dp.id_pedido = p.id_pedido
LEFT JOIN productos pr ON pr.id = dp.id_producto;


-- 4. POLÍTICA RLS (Row Level Security)
--    Asegura que los usuarios solo ven sus propios pedidos
--    NOTA: Asegúrate de tener RLS habilitado en la tabla 'pedidos'

-- Habilitar RLS:
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

-- Política para clientes: solo ven sus propios pedidos
CREATE POLICY "clientes_ven_sus_pedidos"
ON pedidos FOR SELECT
USING (
    auth.uid() = (
        SELECT auth_id FROM usuarios WHERE id = pedidos.id_cliente
    )
);

-- Política para admins y ejecutivos: ven todos los pedidos
CREATE POLICY "admins_ven_todos"
ON pedidos FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM usuarios
        WHERE auth_id = auth.uid()
        AND rol_id IN (1, 3)
    )
);
