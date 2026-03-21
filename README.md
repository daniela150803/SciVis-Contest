# NEX GDDP CMIP6 Climate Explorer

Visualiza cómo **cambia la temperatura del aire entre 2015 y 2100** usando datos reales del modelo climático NASA NEX GDDP CMIP6, explorando patrones por región y escenario de emisiones.

- **Fuente de datos:** OpenVisus / atlantis.sci.utah.edu  
- **Variables:** `tas` (Temperatura Near-Surface Diaria), `huss` (Humedad Específica)  
- **Modelo:** ACCESS-CM2 | **Escenarios:** SSP1-2.6, SSP2-4.5, SSP3-7.0, SSP5-8.5

---

## Requisitos

| Software | Instalación | ¿Obligatorio? |
|----------|-------------|---------------|
| Node.js 18+ | https://nodejs.org | SÍ |
| pnpm | `npm install -g pnpm` | SÍ |
| Python 3.9+ | https://python.org | Recomendado (datos reales) |

---

## Cómo ejecutar

1. Clona o extrae el repositorio en cualquier carpeta de tu PC.
2. Abre una terminal dentro de esa carpeta (clic derecho → **Abrir en Terminal** o PowerShell).
3. Instala dependencias:
```
   pnpm install
```
4. Inicia el servidor de datos Python (en una terminal):
```
   cd artifacts\python-service
   python app.py
```
5. Inicia el API server Node (en otra terminal):
```
   cd artifacts\api-server
   $env:PYTHON_SERVICE_URL="http://localhost:5001"
   pnpm dev
```
6. Inicia el frontend (en otra terminal):
```
   cd artifacts\climate-viz
   pnpm dev
```
7. Abre **http://localhost:5173** en el navegador.

> Necesitas **3 terminales abiertas simultáneamente** para que todo funcione.

---

## Modos de datos

### Con Python (datos reales CMIP6)
El servidor Python se conecta al dataset NEX GDDP CMIP6 vía OpenVisus y descarga datos reales de temperatura y humedad. **La primera carga tarda entre 30 y 60 segundos** mientras se descargan los datos del servidor remoto.

Instala las dependencias Python una sola vez:
```
pip install flask flask-cors numpy OpenVisus
```

### Sin Python (datos sintéticos)
Si el servidor Python no está corriendo, el API server Node responde automáticamente con datos sintéticos basados en las trayectorias de calentamiento del IPCC AR6. Todos los gráficos y regiones funcionan normalmente.

---

## Solución de problemas

**El dashboard aparece en blanco**  
→ Verifica que las 3 terminales estén corriendo. Revisa la consola del navegador (F12) por errores de red.

**`pnpm` no se encuentra**  
→ Ejecuta `npm install -g pnpm` y reinicia la terminal.

**Error de puerto ocupado (EADDRINUSE)**  
→ Identifica el proceso con `netstat -ano | findstr :3001` y mátalo con `taskkill /PID <número> /F`.

**OpenVisus tarda mucho o no conecta**  
→ Es normal en la primera carga. El servidor hace caché local en `./visus_cache_can_be_erased`. Si falla, la app continúa con datos sintéticos.

**Los datos no aparecen en el dashboard**  
→ Confirma que el `vite.config.ts` del frontend tiene el proxy configurado apuntando a `localhost:3001`, y que el `main.tsx` llama a `setBaseUrl("")`.
