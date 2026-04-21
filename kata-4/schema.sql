-- Schema opcional da Kata 4.
-- Modela as entidades de origem (pedidos, clientes, entregas) em banco relacional
-- para um cenário em que o pipeline deixe de ler CSV puro e passe a consumir
-- staging tables.

PRAGMA foreign_keys = ON;

CREATE TABLE customers (
    id_cliente      TEXT PRIMARY KEY,
    nome_cliente    TEXT NOT NULL,
    cidade_original TEXT NOT NULL,
    cidade_norm     TEXT NOT NULL,
    estado          TEXT NOT NULL,
    data_cadastro   TEXT
);

CREATE TABLE orders (
    id_pedido      TEXT PRIMARY KEY,
    id_cliente     TEXT NOT NULL REFERENCES customers(id_cliente),
    valor_total    NUMERIC NOT NULL,
    status_pedido  TEXT NOT NULL,
    data_pedido    TEXT NOT NULL
);

CREATE TABLE deliveries (
    id_entrega              TEXT PRIMARY KEY,
    id_pedido               TEXT NOT NULL REFERENCES orders(id_pedido),
    data_prevista_entrega   TEXT,
    data_realizada_entrega  TEXT,
    status_entrega          TEXT NOT NULL
);

CREATE INDEX idx_orders_customer_date
    ON orders (id_cliente, data_pedido);

CREATE INDEX idx_orders_status_date
    ON orders (status_pedido, data_pedido);

CREATE INDEX idx_deliveries_order
    ON deliveries (id_pedido);

CREATE INDEX idx_deliveries_status
    ON deliveries (status_entrega);

-- Estratégias de evolução:
-- 1. particionar `orders` por data_pedido em bancos que suportem partitioning;
-- 2. manter `cidade_original` para exibição e `cidade_norm` para agrupamento;
-- 3. usar staging raw -> tabela tratada -> mart consolidado para BI;
-- 4. em warehouse, preferir Parquet/Delta/Iceberg para leitura analítica.
