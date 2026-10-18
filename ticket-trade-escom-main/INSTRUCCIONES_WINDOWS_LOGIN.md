# Entrega exclusiva del login — Ticket Trade

Este ZIP está basado en `main` y contiene únicamente el inicio de sesión:

- formulario de correo y contraseña;
- validación de credenciales de las cuentas de demostración;
- navegación al sistema después del acceso;
- mensajes de éxito y error;
- contraseña de prueba almacenada para la demostración local.

No incluye registro, recuperación de contraseña, perfil, validaciones institucionales, roles nuevos, permisos, QR ni cambios de eventos.

## Comandos para Windows PowerShell

```powershell
git clone https://github.com/isntle/ticket-trade-escom.git
cd ticket-trade-escom
Expand-Archive -Path "$env:USERPROFILE\Downloads\ticket-trade-login.zip" -DestinationPath . -Force

npm install
npm run lint
npm run build

git status --short
git add src
git diff --cached --name-only
git commit -m "Implementar inicio de sesión"
git pull --rebase origin main
git push origin main
```

Para ejecutarlo localmente:

```powershell
npm run dev
```

Abre `http://localhost:3000/login`.

Las cuentas de demostración usan la contraseña `Password123!`.
