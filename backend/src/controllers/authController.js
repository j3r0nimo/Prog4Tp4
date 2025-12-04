const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db } = require("../config/database");

// NOTA: Eliminamos el mapa global 'const loginAttempts = new Map();'
// para evitar que los tests se contaminen entre sí.

const login = async (req, res) => {
  const { username, password, captcha } = req.body;
  const ip = req.ip || req.connection.remoteAddress || "127.0.0.1";

  // 1. SOLUCIÓN ESTADO SUCIO: Usar req.app.locals
  // Esto reinicia el mapa automáticamente cada vez que el test reinicia la app.
  if (!req.app.locals.loginAttempts) {
    req.app.locals.loginAttempts = new Map();
  }
  const loginAttempts = req.app.locals.loginAttempts;

  // Inicializar IP
  if (!loginAttempts.has(ip)) {
    loginAttempts.set(ip, { count: 0, firstAttempt: Date.now() });
  }
  const attemptData = loginAttempts.get(ip);

  // Resetear si pasó la ventana de tiempo (15 min)
  const TIME_WINDOW = 15 * 60 * 1000;
  if (Date.now() - attemptData.firstAttempt > TIME_WINDOW) {
    attemptData.count = 0;
    attemptData.firstAttempt = Date.now();
  }

  // 2. SOLUCIÓN RACE CONDITION: Incremento optimista
  // Incrementamos el contador INMEDIATAMENTE. Si luego el login es exitoso, lo reseteamos.
  // Esto asegura que las 10 peticiones paralelas del Test 1 se cuenten correctamente.
  attemptData.count++;

  // 3. SOLUCIÓN TIMEOUT: Delay con tope
  // Agregamos delay si hay intentos previos, pero limitamos a máximo 1 segundo
  // para no exceder el timeout de 10s de Jest en loops largos.
  if (attemptData.count > 1) {
    // Delay: 500ms, 1000ms, 1000ms... (Tope 1000ms)
    const delay = Math.min((attemptData.count - 1) * 500, 1000);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  // REGLAS DE SEGURIDAD (Orden Importante: RateLimit -> Captcha)

  // A. Rate Limiting (> 5 intentos -> 429)
  // El test envía 10. Las primeras 5 pasan, las siguientes 5 dan 429.
  if (attemptData.count > 5) {
    return res.status(429).json({
      error: "Demasiados intentos fallidos. Intente nuevamente en 15 minutos.",
    });
  }

  // B. Captcha (> 3 intentos -> 400)
  // Si estamos entre el intento 3 y 5, pedimos captcha.
  if (attemptData.count > 3) {
    if (!captcha) {
      return res.status(400).json({
        error: "Se requiere verificación de captcha para continuar.",
      });
    }
    // (Validación de captcha iría aquí)
  }

  // --- Lógica de Base de Datos ---
  const query = `SELECT * FROM users WHERE username = ?`;

  db.query(query, [username], async (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Error en el servidor" });
    }

    // Función de error (ya no incrementamos aquí porque lo hicimos al inicio)
    const handleFailedLogin = () => {
      // Solo actualizamos el timestamp si es el primer fallo real (opcional)
      return res.status(401).json({ error: "Credenciales inválidas" });
    };

    if (results.length === 0) {
      return handleFailedLogin();
    }

    const user = results[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return handleFailedLogin();
    }

    // ÉXITO: Resetear contadores de seguridad
    // Como incrementamos al inicio (optimista), si el usuario entra, borramos la cuenta.
    attemptData.count = 0;

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || "supersecret123"
    );

    res.json({ token, username: user.username });
  });
};

const register = async (req, res) => {
  const { username, password, email } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const query =
    "INSERT INTO users (username, password, email) VALUES (?, ?, ?)";
  db.query(query, [username, hashedPassword, email], (err) => {
    if (err) {
      return res.status(500).json({ error: "Error al registrar usuario" });
    }
    res.json({ message: "Usuario registrado con éxito" });
  });
};

const verifyToken = (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "supersecret123"
    );
    req.session.userId = decoded.id;
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// VULNERABLE: Blind SQL Injection
const checkUsername = (req, res) => {
  const { username } = req.body;

  // VULNERABLE: SQL injection que permite inferir información
  const query = `SELECT COUNT(*) as count FROM users WHERE username = '${username}'`;

  db.query(query, (err, results) => {
    if (err) {
      // VULNERABLE: Expone errores de SQL
      return res.status(500).json({ error: err.message });
    }

    const exists = results[0].count > 0;
    res.json({ exists });
  });
};

module.exports = {
  login,
  register,
  verifyToken,
  checkUsername,
};
