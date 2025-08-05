// API Documentation Generator

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  summary: string;
  description: string;
  tags: string[];
  requiresAuth: boolean;
  requiredRoles?: string[];
  parameters?: {
    name: string;
    in: 'query' | 'path' | 'body' | 'header';
    required: boolean;
    type: string;
    description: string;
    example?: any;
  }[];
  requestBody?: {
    required: boolean;
    contentType: string;
    schema: any;
    example?: any;
  };
  responses: {
    [statusCode: string]: {
      description: string;
      schema?: any;
      example?: any;
    };
  };
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
}

// API Documentation
export const apiDocumentation: Record<string, ApiEndpoint[]> = {
  shifts: [
    {
      method: 'GET',
      path: '/api/shifts',
      summary: 'List shifts',
      description: 'Retrieve a paginated list of shifts with filtering and sorting options',
      tags: ['Shifts'],
      requiresAuth: true,
      parameters: [
        {
          name: 'page',
          in: 'query',
          required: false,
          type: 'integer',
          description: 'Page number for pagination',
          example: 1,
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          type: 'integer',
          description: 'Number of items per page (max 100)',
          example: 20,
        },
        {
          name: 'search',
          in: 'query',
          required: false,
          type: 'string',
          description: 'Search term for filtering shifts',
          example: 'warehouse',
        },
        {
          name: 'status',
          in: 'query',
          required: false,
          type: 'string',
          description: 'Filter by shift status',
          example: 'Active',
        },
        {
          name: 'date',
          in: 'query',
          required: false,
          type: 'string',
          description: 'Filter by date (today, tomorrow, this_week, this_month, or specific date)',
          example: 'today',
        },
        {
          name: 'jobId',
          in: 'query',
          required: false,
          type: 'string',
          description: 'Filter by job ID',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
      ],
      responses: {
        '200': {
          description: 'Successful response with shifts list',
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
                    date: { type: 'string', format: 'date', example: '2024-01-15' },
                    startTime: { type: 'string', example: '09:00' },
                    endTime: { type: 'string', example: '17:00' },
                    status: { type: 'string', example: 'Active' },
                    location: { type: 'string', example: 'Warehouse A' },
                    job: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        company: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
              meta: {
                type: 'object',
                properties: {
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'integer', example: 1 },
                      limit: { type: 'integer', example: 20 },
                      total: { type: 'integer', example: 150 },
                      pages: { type: 'integer', example: 8 },
                      hasNext: { type: 'boolean', example: true },
                      hasPrev: { type: 'boolean', example: false },
                    },
                  },
                },
              },
            },
          },
        },
        '401': {
          description: 'Authentication required',
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Authentication required' },
                  code: { type: 'string', example: 'AUTH_REQUIRED' },
                },
              },
            },
          },
        },
        '500': {
          description: 'Internal server error',
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Internal server error' },
                  code: { type: 'string', example: 'INTERNAL_ERROR' },
                },
              },
            },
          },
        },
      },
    },
    {
      method: 'POST',
      path: '/api/shifts',
      summary: 'Create shift',
      description: 'Create a new shift',
      tags: ['Shifts'],
      requiresAuth: true,
      requiredRoles: ['CompanyUser', 'Admin'],
      requestBody: {
        required: true,
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['jobId', 'date', 'startTime', 'endTime'],
          properties: {
            jobId: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
            date: { type: 'string', format: 'date', example: '2024-01-15' },
            startTime: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$', example: '09:00' },
            endTime: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$', example: '17:00' },
            location: { type: 'string', example: 'Warehouse A' },
            description: { type: 'string', example: 'Loading and unloading trucks' },
            requiredCrewChiefs: { type: 'integer', minimum: 0, example: 1 },
            requiredStagehands: { type: 'integer', minimum: 0, example: 5 },
            requiredForkOperators: { type: 'integer', minimum: 0, example: 2 },
            requiredReachForkOperators: { type: 'integer', minimum: 0, example: 1 },
            requiredRiggers: { type: 'integer', minimum: 0, example: 0 },
            requiredGeneralLaborers: { type: 'integer', minimum: 0, example: 3 },
            requestedWorkers: { type: 'integer', minimum: 0, example: 12 },
          },
        },
        example: {
          jobId: '123e4567-e89b-12d3-a456-426614174000',
          date: '2024-01-15',
          startTime: '09:00',
          endTime: '17:00',
          location: 'Warehouse A',
          description: 'Loading and unloading trucks',
          requiredCrewChiefs: 1,
          requiredStagehands: 5,
          requiredForkOperators: 2,
          requestedWorkers: 12,
        },
      },
      responses: {
        '200': {
          description: 'Shift created successfully',
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: '456e7890-e89b-12d3-a456-426614174000' },
                  jobId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
                  date: { type: 'string', example: '2024-01-15' },
                  startTime: { type: 'string', example: '09:00' },
                  endTime: { type: 'string', example: '17:00' },
                  status: { type: 'string', example: 'Pending' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        '400': {
          description: 'Validation error',
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Validation failed: End time must be after start time' },
                  code: { type: 'string', example: 'VALIDATION_ERROR' },
                },
              },
            },
          },
        },
        '403': {
          description: 'Insufficient permissions',
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Insufficient permissions. Required: CompanyUser, Admin' },
                  code: { type: 'string', example: 'INSUFFICIENT_PERMISSIONS' },
                },
              },
            },
          },
        },
      },
    },
  ],
  jobs: [
    {
      method: 'GET',
      path: '/api/jobs',
      summary: 'List jobs',
      description: 'Retrieve a list of jobs with filtering options',
      tags: ['Jobs'],
      requiresAuth: true,
      parameters: [
        {
          name: 'companyId',
          in: 'query',
          required: false,
          type: 'string',
          description: 'Filter by company ID',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        {
          name: 'status',
          in: 'query',
          required: false,
          type: 'string',
          description: 'Filter by job status',
          example: 'Active',
        },
        {
          name: 'search',
          in: 'query',
          required: false,
          type: 'string',
          description: 'Search term for filtering jobs',
          example: 'warehouse',
        },
        {
          name: 'sortBy',
          in: 'query',
          required: false,
          type: 'string',
          description: 'Sort by field (recentShifts, created, updated)',
          example: 'recentShifts',
        },
      ],
      responses: {
        '200': {
          description: 'Successful response with jobs list',
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    status: { type: 'string' },
                    startDate: { type: 'string', format: 'date' },
                    endDate: { type: 'string', format: 'date' },
                    location: { type: 'string' },
                    company: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                      },
                    },
                    recentShifts: {
                      type: 'array',
                      items: { type: 'object' },
                    },
                    totalShifts: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
  ],
  users: [
    {
      method: 'GET',
      path: '/api/users',
      summary: 'List users',
      description: 'Retrieve a paginated list of users',
      tags: ['Users'],
      requiresAuth: true,
      parameters: [
        {
          name: 'role',
          in: 'query',
          required: false,
          type: 'string',
          description: 'Filter by user role',
          example: 'Staff',
        },
        {
          name: 'companyId',
          in: 'query',
          required: false,
          type: 'string',
          description: 'Filter by company ID',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        {
          name: 'isActive',
          in: 'query',
          required: false,
          type: 'boolean',
          description: 'Filter by active status',
          example: true,
        },
        {
          name: 'search',
          in: 'query',
          required: false,
          type: 'string',
          description: 'Search by name or email',
          example: 'john',
        },
      ],
      responses: {
        '200': {
          description: 'Successful response with users list',
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    email: { type: 'string' },
                    role: { type: 'string' },
                    isActive: { type: 'boolean' },
                    avatarUrl: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      method: 'GET',
      path: '/api/users/me',
      summary: 'Get current user',
      description: 'Retrieve the current authenticated user information',
      tags: ['Users'],
      requiresAuth: true,
      responses: {
        '200': {
          description: 'Current user information',
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string' },
                  companyId: { type: 'string', nullable: true },
                  avatarUrl: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
      },
    },
  ],
  analytics: [
    {
      method: 'GET',
      path: '/api/analytics/dashboard',
      summary: 'Get dashboard analytics',
      description: 'Retrieve dashboard analytics data',
      tags: ['Analytics'],
      requiresAuth: true,
      parameters: [
        {
          name: 'period',
          in: 'query',
          required: false,
          type: 'string',
          description: 'Time period for analytics (week, month, quarter, year)',
          example: 'month',
        },
        {
          name: 'companyId',
          in: 'query',
          required: false,
          type: 'string',
          description: 'Filter by company ID',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
      ],
      responses: {
        '200': {
          description: 'Dashboard analytics data',
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  totalShifts: { type: 'integer', example: 150 },
                  completedShifts: { type: 'integer', example: 120 },
                  activeJobs: { type: 'integer', example: 25 },
                  totalWorkers: { type: 'integer', example: 45 },
                  fulfillmentRate: { type: 'number', example: 85.5 },
                  trends: {
                    type: 'object',
                    properties: {
                      shiftsThisPeriod: { type: 'integer' },
                      shiftsLastPeriod: { type: 'integer' },
                      fulfillmentTrend: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  ],
  health: [
    {
      method: 'GET',
      path: '/api/health',
      summary: 'Health check',
      description: 'Check the health status of the API and its dependencies',
      tags: ['System'],
      requiresAuth: false,
      responses: {
        '200': {
          description: 'System health status',
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'healthy' },
                  timestamp: { type: 'string', format: 'date-time' },
                  version: { type: 'string', example: '1.0' },
                  services: {
                    type: 'object',
                    properties: {
                      database: { type: 'string', example: 'healthy' },
                      cache: { type: 'string', example: 'healthy' },
                      storage: { type: 'string', example: 'healthy' },
                    },
                  },
                  uptime: { type: 'number', example: 3600.5 },
                },
              },
            },
          },
        },
      },
    },
  ],
};

// Generate OpenAPI specification
export function generateOpenApiSpec(): any {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'Holitime API',
      version: '1.0.0',
      description: 'API for Holitime workforce management application',
      contact: {
        name: 'API Support',
        email: 'support@holitime.com',
      },
    },
    servers: [
      {
        url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'next-auth.session-token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                code: { type: 'string' },
                details: { type: 'object' },
              },
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                requestId: { type: 'string' },
                version: { type: 'string' },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            total: { type: 'integer', minimum: 0 },
            pages: { type: 'integer', minimum: 0 },
            hasNext: { type: 'boolean' },
            hasPrev: { type: 'boolean' },
          },
        },
      },
    },
    paths: {},
    tags: [
      { name: 'Shifts', description: 'Shift management operations' },
      { name: 'Jobs', description: 'Job management operations' },
      { name: 'Users', description: 'User management operations' },
      { name: 'Analytics', description: 'Analytics and reporting operations' },
      { name: 'System', description: 'System health and monitoring' },
    ],
  };

  // Convert our documentation to OpenAPI paths
  Object.entries(apiDocumentation).forEach(([category, endpoints]) => {
    endpoints.forEach((endpoint) => {
      const pathKey = endpoint.path.replace(/\[([^\]]+)\]/g, '{$1}');
      
      if (!spec.paths[pathKey]) {
        spec.paths[pathKey] = {};
      }
      
      const operation = {
        summary: endpoint.summary,
        description: endpoint.description,
        tags: endpoint.tags,
        parameters: endpoint.parameters?.map(param => ({
          name: param.name,
          in: param.in,
          required: param.required,
          schema: { type: param.type },
          description: param.description,
          example: param.example,
        })),
        requestBody: endpoint.requestBody ? {
          required: endpoint.requestBody.required,
          content: {
            [endpoint.requestBody.contentType]: {
              schema: endpoint.requestBody.schema,
              example: endpoint.requestBody.example,
            },
          },
        } : undefined,
        responses: endpoint.responses,
        security: endpoint.requiresAuth ? [{ sessionAuth: [] }] : [],
      };
      
      spec.paths[pathKey][endpoint.method.toLowerCase()] = operation;
    });
  });

  return spec;
}

// Generate markdown documentation
export function generateMarkdownDocs(): string {
  let markdown = '# Holitime API Documentation\n\n';
  markdown += 'This document describes the REST API endpoints for the Holitime workforce management application.\n\n';
  
  markdown += '## Authentication\n\n';
  markdown += 'Most endpoints require authentication. The API uses session-based authentication with NextAuth.js.\n\n';
  
  markdown += '## Response Format\n\n';
  markdown += 'All API responses follow a consistent format:\n\n';
  markdown += '```json\n';
  markdown += JSON.stringify({
    success: true,
    data: '// Response data',
    meta: {
      timestamp: '2024-01-15T10:30:00Z',
      requestId: 'req_123456789',
      version: '1.0',
      pagination: '// Only for paginated responses',
    },
  }, null, 2);
  markdown += '\n```\n\n';
  
  markdown += '## Error Responses\n\n';
  markdown += 'Error responses follow this format:\n\n';
  markdown += '```json\n';
  markdown += JSON.stringify({
    success: false,
    error: {
      message: 'Error description',
      code: 'ERROR_CODE',
      details: '// Additional error details',
    },
    meta: {
      timestamp: '2024-01-15T10:30:00Z',
      requestId: 'req_123456789',
      version: '1.0',
    },
  }, null, 2);
  markdown += '\n```\n\n';
  
  // Generate documentation for each category
  Object.entries(apiDocumentation).forEach(([category, endpoints]) => {
    markdown += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
    
    endpoints.forEach((endpoint) => {
      markdown += `### ${endpoint.method} ${endpoint.path}\n\n`;
      markdown += `${endpoint.description}\n\n`;
      
      if (endpoint.requiresAuth) {
        markdown += '**Authentication:** Required\n\n';
        if (endpoint.requiredRoles) {
          markdown += `**Required Roles:** ${endpoint.requiredRoles.join(', ')}\n\n`;
        }
      }
      
      if (endpoint.parameters && endpoint.parameters.length > 0) {
        markdown += '**Parameters:**\n\n';
        endpoint.parameters.forEach((param) => {
          markdown += `- \`${param.name}\` (${param.type}${param.required ? ', required' : ', optional'}) - ${param.description}\n`;
        });
        markdown += '\n';
      }
      
      if (endpoint.requestBody) {
        markdown += '**Request Body:**\n\n';
        markdown += '```json\n';
        markdown += JSON.stringify(endpoint.requestBody.example || endpoint.requestBody.schema, null, 2);
        markdown += '\n```\n\n';
      }
      
      markdown += '**Responses:**\n\n';
      Object.entries(endpoint.responses).forEach(([status, response]) => {
        markdown += `- \`${status}\` - ${response.description}\n`;
      });
      markdown += '\n';
    });
  });
  
  return markdown;
}

// Export documentation utilities
export const apiDocs = {
  endpoints: apiDocumentation,
  generateOpenApiSpec,
  generateMarkdownDocs,
};