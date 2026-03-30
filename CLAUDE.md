# Notas del proyecto Maná

## Contexto de la app

- **Offline-first y mobile-first**: la app debe funcionar 100% sin conexión
- La Biblia (JSON estático) y las lecturas del día (algoritmo local) deben andar sin red
- PWA instalada en iOS y Android, deployada en Vercel


## Service Worker — cache versioning

Al hacer deploy, si querés forzar la limpieza de todos los runtime caches en los
dispositivos de los usuarios (navegación, Supabase, API), incrementar la constante
`CV` en `frontend/src/sw.ts`:

```ts
// frontend/src/sw.ts, línea ~14
const CV = 'v2'  // → cambiar a 'v3', 'v4', etc.
```

Cuándo hacerlo:
- Cambio estructural en rutas de la app
- Cambio en contratos de API/Supabase que hace incompatible la caché vieja
- Cualquier bug causado por datos cacheados obsoletos

No hace falta tocarlo en deploys normales: los assets JS/CSS ya se invalidan
automáticamente por los content-hashes que genera Vite.
