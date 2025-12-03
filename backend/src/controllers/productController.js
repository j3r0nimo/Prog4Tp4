const { db } = require('../config/database');

const getProducts = (req, res) => {
  const { category, search } = req.query;

  // cambio: validación estricta para evitar inyección vía category
  // El test exige que *cualquier* categoría con símbolos no alfanuméricos devuelva [] y status 200.
  if (category) {
    const validCategory = /^[a-zA-Z0-9]+$/.test(category);

    if (!validCategory) {
      // categoría inválida, lista vacía como piden los tests
      return res.status(200).json([]);
    }
  }

  // 1. Iniciamos la query base
  let query = 'SELECT * FROM products WHERE 1=1';

  // 2. Creamos un array para guardar los valores seguros
  const params = [];

  // 3. Si hay categoría, usamos el placeholder '?' y guardamos el valor en params
  // Esto se mantiene igual. Ahora solo llega acá si es válida
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  // 4. Si hay búsqueda, usamos '?' y preparamos el string con los % en JS
  // Esto ya era seguro. Solo agregamos el valor al params.
  if (search) {
    query += ' AND name LIKE ?';
    params.push(`%${search}%`);
  }

  // 5. Pasamos 'params' como segundo argumento a db.query
  // sin cambios, ya se está usando consultas parametrizadas correctamente
  db.query(query, params, (err, results) => {
    if (err) {
      // cambio: evitar filtrar mensaje SQL real, no mostrar err.sqlMessage
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
};

module.exports = {
  getProducts
};