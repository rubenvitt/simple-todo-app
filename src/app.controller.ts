import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('General')
@Controller()
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
    example: 'Hello World!',
  })
  getHello(): string {
    return this.appService.getHello();
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
