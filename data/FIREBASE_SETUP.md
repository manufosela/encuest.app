# Configuración inicial de Firebase

## 1. Crear la base de datos

Ve a **Firebase Console > Realtime Database** y crea una nueva base de datos.

## 2. Importar datos iniciales

### Opción A: Importar JSON completo
1. Ve a **Realtime Database** en Firebase Console
2. Haz clic en los **3 puntos** → **Importar JSON**
3. Selecciona el archivo `firebase-initial-data.json`
4. Confirma la importación

### Opción B: Añadir manualmente
1. Ve a la raíz de tu Realtime Database
2. Haz clic en **+** para añadir un hijo
3. Nombre: `admins`
4. Haz clic en **+** dentro de `admins`
5. Nombre: `mjfosela@gmail,com`
6. Añade estos campos:
   ```
   role: "superadmin"
   name: "Administrador Principal" 
   addedAt: 1700000000000
   ```

## 3. Desplegar reglas de seguridad

```bash
firebase deploy --only database
```

## 4. Verificar configuración

1. **Datos**: Verifica que existe `/admins/mjfosela@gmail,com`
2. **Reglas**: Verifica que se desplegaron correctamente
3. **Auth**: Verifica que Google Authentication está habilitado

## Estructura final esperada

```json
{
  "admins": {
    "mjfosela@gmail,com": {
      "role": "superadmin",
      "name": "Administrador Principal",
      "addedAt": 1700000000000
    }
  }
}
```

**⚠️ IMPORTANTE**: Firebase no permite `.` en claves, por eso `mjfosela@gmail.com` se convierte en `mjfosela@gmail,com`

## ¡Listo!

Una vez completado, `mjfosela@gmail.com` podrá acceder al panel de administración.