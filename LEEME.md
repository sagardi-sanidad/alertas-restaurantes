# Corrección de alertas restaurantes

Esta versión parte de la app original de Cadaqués Madrid y mantiene su diseño, su rejilla de iconos, su práctica, su examen y su explorador. Añade la pantalla de selección de restaurante y consulta el Google Sheet al cambiar de local o pulsar Actualizar datos.

**Ingredientes:** no aparecen en las pantallas ni en el código de la web, y el servicio público ya no los devuelve.

## Pasos para Aina

1. Guardar copia de seguridad del `index.html` actual del repositorio `alertas-restaurantes`. No modificar el repositorio antiguo `alergenos-cadaques-madrid`.
2. Desde el Google Sheet original, abrir Extensiones > Apps Script y sustituir el contenido de `Code.gs` por este archivo. Guardar.
3. Implementar > Gestionar implementaciones > editar la implementación activa > elegir Nueva versión > Implementar. La URL `/exec` debe seguir siendo la misma si se actualiza la implementación existente.
4. Comprobar la URL `/exec?action=catalog&callback=cb_prueba` y una ficha con `/exec?action=restaurant&id=CADAQU%C3%89S%20MAD&callback=cb_prueba`. En la segunda respuesta NO debe aparecer `ingredients` ni textos de composición.
5. Sustituir `index.html` en la raíz del repositorio `alertas-restaurantes` por el de este paquete. La URL de Apps Script configurada dentro corresponde a la que figuraba en la web publicada el 29/09/2026. Si Aina ha creado una implementación nueva, debe cambiar `API_URL` por su nueva URL `/exec`.
6. Esperar la publicación de GitHub Pages. Probar Cadaqués Madrid y otros tres locales. Verificar práctica, examen, explorador, selector y actualización de un plato. Buscar `ingredient` en el código público y en la respuesta de la API: no debe haber listas de ingredientes.

No publicar sin revisar los datos de alertas, las equivalencias entre locales y el acceso del dominio de Google Workspace. Los platos con alertas incompletas se excluyen de las preguntas y de la consulta, para no mostrar un `NO` implícito.
