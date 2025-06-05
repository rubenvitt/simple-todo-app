import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('General')
@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Welcome message',
    description: 'Get a welcome message from the API',
  })
  @ApiResponse({
    status: 200,
    description: 'Welcome message retrieved successfully',
    example: {
      message: '🚀 Backend API running on port 3000. Frontend is available at http://localhost:5173',
      environment: 'development'
    },
  })
  getHello(): object {
    return {
      message: this.appService.getHello(),
      environment: process.env.NODE_ENV || 'development'
    };
  }

  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description: 'Check the health status of the API and its services',
  })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved successfully',
    example: {
      status: 'ok',
      timestamp: '2024-01-01T00:00:00.000Z',
      service: 'simple-todo-app',
      version: '0.0.1',
      database: 'connected',
      uptime: '00:05:30',
    },
  })
  getHealth(): object {
    const appHealth = this.appService.getHealth();
    return {
      ...appHealth,
      service: 'simple-todo-app',
      version: '0.0.1',
    };
  }
}
