# Seguridad — Prevención de SQL Injection

Este módulo implementa una versión segura de la ruta `/products` evitando inyección SQL mediante:

- Consultas parametrizadas (`?`)
- Validación estricta del input del usuario
- Escape correcto para búsquedas
- No exposición de errores internos de la base de datos

## Antes (Vulnerable)

El proyecto originalmente construía queries concatenando strings:

```js
let query = 'SELECT * FROM products WHERE 1=1';

if (category) {
  query += ` AND category = '${category}'`;
}

if (search) {
  query += ` AND name LIKE '%${search}%'`;       
}
```

Esto permitía:

* `' OR '1'='1`

* `'; DROP TABLE products; --`

* `UNION SELECT`

* ataques con comentarios SQL `--`, `/*`, `#`

## Después (Seguro)

La versión corregida incluye:

### Validación estricta (Requisito del test)

Se rechazan categorías con caracteres no alfanuméricos:

```js
if (category) {
  const valid = /^[a-zA-Z0-9]+$/.test(category);
  if (!valid) return res.status(200).json([]);
}
```

### Consultas preparadas

```js
let query = 'SELECT * FROM products WHERE 1=1';
const params = [];

if (category) {
  query += ' AND category = ?';
  params.push(category);
}

if (search) {
  query += ' AND name LIKE ?';
  params.push(`%${search}%`);
}

db.query(query, params, (err, results) => {
  if (err) return res.status(500).json({ error: 'Database error' });
  res.json(results);
});

```

### Manejo seguro de errores
No se muestra `err.sqlMessage`.
Se devuelve:
```js
{ error: 'Database error' }
```
Esto evita filtrar estructura de tablas, columnas o SQL interno.