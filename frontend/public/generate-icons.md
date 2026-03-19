# Generación de Íconos

Para generar los íconos de la PWA, necesitás un SVG o PNG base de 512x512px.

## Opción 1: Usando `sharp` (Node.js)

```bash
npm install -g sharp-cli

# Desde la raíz de /public:
sharp -i icon-source.png -o icons/icon-192.png resize 192 192
sharp -i icon-source.png -o icons/icon-512.png resize 512 512
```

## Opción 2: Usando ImageMagick

```bash
convert icon-source.png -resize 192x192 icons/icon-192.png
convert icon-source.png -resize 512x512 icons/icon-512.png
```

## Opción 3: Online

- https://realfavicongenerator.net/
- https://pwa-asset-generator.vercel.app/

## Ícono sugerido para Maná

Un cáliz dorado sobre fondo crema, o una llama de vela estilizada.
Color primario: #8B6914 (dorado Maná)
