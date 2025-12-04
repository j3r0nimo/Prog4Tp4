# Documentación técnica: Explicación completa

### 1. ¿Qué era vulnerable?
El código original tenia inyeccion sql clasica:

```js
query += ` AND category = '${category}'`;
query += ` AND name LIKE '%${search}%'`;
```

Eso permitía:

* Alterar la lógica del WHERE

* Ejecutar consultas adicionales

* Revelar estructura de la base (`information_schema`)

* Ejecutar `DROP TABLE`, `UPDATE`, `DELETE`, etc.

* Hacer `UNION SELECT` para extraer datos de otras tablas

Además:

* No había validación de parámetros

* Se devolvían mensajes SQL reales

* Los comentarios SQL (`--`,`/*`,`#`) cortaban la query

* El test específicamente esperaba que cualquier input malicioso devolviera `[]`
---
### 2. ¿Cómo lo exploté?

Con strings inyectados como:

#### a) Autenticación lógica:

`' OR '1'='1` devolvía todos los productos.

#### b) Eliminación:

`'; DROP TABLE products; --`
hubiera permitido borrar tablas si el usuario de BD tuviera privilegios.

#### c) Extracción de datos:

`' UNION SELECT table_name, column_name ...`
El código vulnerable devolvía nombres de tablas y columnas.

#### d) Comentarios SQL:

`Electronics' --`
El resto de la query quedaba ignorado.

#### e) Manipulación del LIKE:

`%' OR name IS NOT NULL --`

Todo esto aparecía directamente en los tests.

---
### 3. ¿Cómo se corrigió?

#### a) Validación estricta
El test pide que inputs con símbolos devuelvan lista vacía.
Por eso se agrega:
```js
if (category) {
  const valid = /^[a-zA-Z0-9]+$/.test(category);
  if (!valid) return res.status(200).json([]);
}
```
Esto evita:

* Comentarios SQL

* Comillas simples

* UNION SELECT

* Cualquier payload malicioso
#### b) Consultas preparadas (defensa real)
```js
query += ' AND category = ?';
params.push(category);

query += ' AND name LIKE ?';
params.push(`%${search}%`);
```
MySQL interpreta `?` como literal seguro, no como SQL ejecutable.
#### c) Manejo seguro de errores.
Antes:
`return res.status(500).json({ error: err.message });`
Revelaba:
* Columnas
* Tablas
* SQL que se ejecutó

Ahora:
```js
return res.status(500).json({ error: 'Database error' });
```

#### d) Eliminación total de concatenación SQL

Ya no existe ninguna parte del código que construya SQL a mano.

---

### 4. ¿Qué aprendí?

* parametrizar no siempre es suficiente si los tests esperan un comportamiento específico (como devolver `[]`).

* Que la validación de entrada es tan importante como el uso de consultas preparadas.

* Cómo los comentarios SQL (`--`,`/*`,`#`) pueden romper una query incluso con escapes parciales.

* Qué errores internos nunca deben exponerse.

* Que los tests automáticos realmente simulan ataques reales de SQL Injection.