# Configuración de Administradores

## Sistema de Administración

El sistema verifica automáticamente contra la base de datos si un usuario que hace login es administrador.

## Configuración inicial en Firebase Database

### 1. Ve a Firebase Console > Realtime Database

### 2. Añade manualmente la estructura de admins:

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

**⚠️ IMPORTANTE**: Firebase no permite `.` en las claves, así que `mjfosela@gmail.com` se convierte en `mjfosela@gmail,com` (punto por coma).

## Funcionamiento

1. **Login**: Cualquier usuario puede hacer login con Google
2. **Verificación**: El sistema verifica si su email existe en `/admins/`
3. **Acceso**: 
   - ✅ Si está en la BD → Acceso completo al admin
   - ❌ Si NO está → Error y logout automático

## Añadir más administradores

### Opción 1: Manualmente en Firebase Console
```json
{
  "admins": {
    "mjfosela@gmail,com": {
      "role": "superadmin",
      "name": "Administrador Principal",
      "addedAt": 1700000000000
    },
    "otro@email,com": {
      "role": "admin", 
      "name": "Otro Admin",
      "addedAt": 1700000000001
    }
  }
}
```

### Opción 2: Desde la aplicación
Los superadmins pueden añadir nuevos admins usando las funciones:
```javascript
import { addAdmin } from './src/lib/firebase/admin.js';
await addAdmin('nuevo@email.com', 'Nombre Admin', 'admin');
```

## Roles disponibles

- **`superadmin`**: Puede gestionar otros admins + todas las funciones
- **`admin`**: Solo puede gestionar encuestas y sorteos

## Ventajas de este sistema

- ✅ **Escalable**: Fácil añadir/quitar admins
- ✅ **Seguro**: Verificación en BD + reglas Firebase
- ✅ **Sin hardcoding**: No emails en el código
- ✅ **Flexible**: Diferentes niveles de permisos
- ✅ **Auditable**: Se ve quién tiene acceso y cuándo se añadió