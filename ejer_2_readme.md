## Documentacion Command Injection

### Correcciones hechas

### 1. ¿QUE ERA VULNERABLE?

el endpoint ``POST api/ping`` era inseguro:

- el problema: La aplicación tomaba el texto que el usuario escribía en el campo host y lo pegaba directamente dentro de una instrucción del sistema operativo sin revisarlo.

- La función peligrosa: Originalmente se usaba exec() , que abre una terminal (shell) completa.

### 2. ¿COMO LO EXPLOTASTE?

Aprovechamos que la terminal permite ejecutar varios comandos en una sola línea usando separadores especiales. Engañamos al servidor para que creyera que le enviábamos una IP, cuando en realidad le enviábamos una IP seguida de órdenes maliciosas.

* Los separadores usados: ``;`` , ``&&``, o ``|``.
* Entrada: ``8.8.8.8; ls -la``
* Resultado: hace un ping a google y despues lista todos los archivos que hay en el sistema, mostrando en formato detallado cada archivo y tambien los ocultos

### 3. ¿COMO LO CORREGISTE?


#### 3.1. Validacion estricta

**Requisito del Test:** "Solo debe aceptar IPs o hostnames válidos"
Se implementaron expresiones regulares para asegurar que en el input entren nada mas que ip o hostnames y para evitar caracteres especiales como ;, &, |, etc.

```
const HOSTNAME_REGEX = /^[a-zA-Z0-9.-]+$/;
const allowedHosts = ['8.8.8.8', '1.1.1.1', 'google.com'];

if (!host || (!IP_REGEX.test(host) && !HOSTNAME_REGEX.test(host))) {
    return res.status(400).json({
      error: 'Invalid host format. Only simple IP addresses or hostnames are allowed.'
    });
  }
```

#### 3.2. Lista Blanca

**Requisito del Test:** "Debe usar una lista blanca de comandos permitidos"
Por mas que el formato del input sea el correcto, hay que comprobar si el input esta dentro de la lista de 'destinos aprobados'.

```
const allowedHosts = ['8.8.8.8', '1.1.1.1', 'google.com'];
if (!allowedHosts.includes(host)) {
    return res.status(403).json({
      error: 'Access denied. The specified host is not on the allowed whitelist.'
    });
  }
```

#### 3.3. Ejecucion segura

**Requisito del Test:** "No debe ejecutar comandos arbitrarios"
Se cambio ``exec`` (que se ejecuta en el shell) por ``spawn``(que recibe el comando y los argumentos por separado en un array). Esto nos evita el problema de que el sistema tome los argumentos como nuevos comandos.

```
const { spawn } = require('child_process');
const pingProcess = spawn('ping', ['-c', '1', host]);
// asi seria en linux, en windows cambiamos el "-c" de "spawn('ping', ['-c', '1', host])" por un "-n"
```

el input nunca se trata como codigo ejecutable, si no como un argumento de texto.

#### 3.4. Sanitizacion de errores

**Requisito del test:** "No debe exponer errores del sistema"
Se evita enviar el stderr crudo al cliente y se captura internamente. En cambio al cliente le llega un mensaje generico, evitando la fuga de informacion.

```
let stderr = '';

pingProcess.stderr.on('data', (data) => {
    stderr += data.toString();
  });

pingProcess.on('error', (err) => {
    return res.status(500).json({ error: 'Diagnostico de red fallo por problema interno.' });
  });

pingProcess.on('close', (code) => {
  if (code !== 0) {
    return res.status(500).json({ error: 'Host inaccesible o fallo algo.' });
  }
  ...
;
```

### 4. ¿QUE APRENDISTE?

* Nunca confiar en el usuario: todo input debe ser tratado como potencialmente malicioso.
* El uso de ``Spawn`` para asegurar la aislacion del comando con los argumentos.
* El cliente NUNCA tiene que ver los errores de manera detallada, siempre de manera generica.