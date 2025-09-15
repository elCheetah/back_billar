// Este es solo un archivo para marcar la estructura del proyecto, por lo que debe ser eliminado 


/*
Vista rápida del funcionamiento y contenido de esta carpeta

Los middlewares son funciones intermedias que se ejecutan antes o despues de los controladores
    
    - Validación de datos
    - Autenticación y autorización
    - Manejo de errores
    - Logging
    - Procesamiento de cabeceras

Se puede manejar middlewares globales (toda la aplicación) o por ruta (por endpoint), hay más pero esos los puedes investigar ;) 

¡ Se debe ser cuidadoso al momento de desarrollar y aplicar un middleware !

Pese a que permiten reutilizar código, separar responsabilidades y 
realizar procesos en cadena (Secuencia que transforma gradualmente una peticion)

Si no se usan correctamente pueden generar muchos problemas como:
    1. Orden de ejecución dificil de seguir, si se usa demasiado puede complicar el entender el flujo de ejecución
    2. Comportamientos inesperados, puede causarse al no tener documentación y/o aplicación adecuada 
    3. Rendimiento, cada middleware añade una capa de procesamiento, por lo que demasiados pueden degradar el rendimiento
    4. Terminación incorrecta, si un middleware no llama a 'next()' cuando debería, la peticion se queda colgada
    5. Dependencias ocultas, pueden generar dependencias entre sí
    6. Con la aplicación de muchos mi 
    7. El impacto de los middlewares puede ser no evidente a primera vista, por lo que puede requerir algo de experiencia para interpretarlo correctamente
*/