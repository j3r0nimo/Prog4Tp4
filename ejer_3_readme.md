

 Documentación de Entrega – CSRF ( test3)
============================================

1) ¿Qué era vulnerable?
- El endpoint POST /api/transfer aceptaba peticiones que modifican estado sin verificar el origen (Origin/Referer) ni requerir un token CSRF vinculado a la sesión. Cualquier sitio externo podía forzar a un usuario autenticado a ejecutar una acción.

2) ¿Cómo lo explotaste?
- Mediante una página maliciosa (evil.com) que envía un formulario oculto a /api/transfer cuando la víctima ya está autenticada en el sitio legítimo. El navegador incluye automáticamente las cookies de sesión, permitiendo la acción sin consentimiento.

3) ¿Cómo lo corregiste?
- Generación de token por sesión: endpoint GET /api/csrf-token que devuelve un token aleatorio (crypto.randomBytes(32)) y lo guarda en la sesión.
- Cookie SameSite=Strict: el token también se expone en cookie con SameSite=Strict para reducir el envío en contextos cross-site.
- Validación de origen: middleware originCheck que solo permite peticiones provenientes de http://localhost:3000 (comparando Origin/Referer).
- Orden de middlewares: primero originCheck, luego csrfProtection, para devolver mensajes claros según la falla.
- Protección del endpoint: router.post('/transfer', originCheck, csrfProtection, controller).

4) ¿Qué aprendiste?
- Las acciones que cambian estado deben verificar tanto el origen como la intención del usuario.
- La semántica de errores importa: validar primero Origin/Referer facilita diagnósticos y evita fugas de detalles.
- SameSite=Strict mitiga muchos escenarios CSRF, pero no reemplaza el token por sesión.
- Los tests ayudan a definir con precisión los requisitos (token único por sesión, longitud suficiente, encabezados esperados, cookie SameSite) y a fijar el orden correcto de los middlewares.

