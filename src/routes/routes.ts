// Este es solo un archivo para marcar la estructura del proyecto, por lo que debe ser eliminado 


/*
Vista rápida del funcionamiento y contenido de esta carpeta

Define las rutas (URL's) de la API

    - Mapeo de URL a controladores
    - Aplicación de middlewares específicos a rutas
*/

import { Router } from 'express';

const router = Router();

// router.get('/', index);

export { router as userRouter };