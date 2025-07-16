import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

export function setupSwagger(app: Express) {
  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'My Rental API', 
        version: '1.0.0', 
        description: 'API documentation for my rental app', 
      },
      servers: [
        {
          url: 'http://localhost:3000', // Βάση URL backend
        },
      ],
    },
    apis: ['./src/routes/*.ts'], 
  };

  const swaggerSpec = swaggerJSDoc(options);

  // Serve swagger docs στο /api-docs
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}