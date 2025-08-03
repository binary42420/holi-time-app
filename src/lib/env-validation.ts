import { z } from 'zod';

// Environment validation schema
const envSchema = z.object({
  // Core application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_TELEMETRY_DISABLED: z.string().optional(),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),

  // Database - either DATABASE_URL or individual DB_* variables required
  DATABASE_URL: z.string().optional(),
  DATABASE_URL_DIRECT: z.string().optional(),
  
  // Individual database variables (fallback)
  DB_USER: z.string().optional(),
  DB_PASS: z.string().optional(),
  DB_HOST: z.string().optional(),
  DB_NAME: z.string().optional(),
  DB_PORT: z.string().optional(),

  // Authentication
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // Google OAuth & APIs
  GOOGLE_CLIENT_ID: z.string().min(15, 'GOOGLE_CLIENT_ID is required, and over 15 characters long'),
  GOOGLE_CLIENT_SECRET: z.string().min(15, 'GOOGLE_CLIENT_SECRET is required'),
  GOOGLE_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),

  // Email (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // Real-time (optional)
  NEXT_PUBLIC_WS_URL: z.string().optional(),

  // File storage (optional)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  GOOGLE_CLOUD_PROJECT_ID: z.string().optional(),
  GOOGLE_CLOUD_STORAGE_BUCKET: z.string().optional(),

  // Monitoring (optional)
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  NEXT_PUBLIC_APP_VERSION: z.string().optional(),

  // Development (optional)
  DEBUG: z.string().optional(),
  DATABASE_LOGGING: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

interface ValidationResult {
  success: boolean;
  data?: EnvConfig;
  errors?: string[];
  warnings?: string[];
}

/**
 * Validate environment variables
 */
export function validateEnv(): ValidationResult {
  try {
    const result = envSchema.safeParse(process.env);
    
    if (!result.success) {
      const errors = result.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
      return { success: false, errors };
    }

    const warnings: string[] = [];
    const data = result.data;

    // Database configuration validation
    const hasDatabaseUrl = !!data.DATABASE_URL;
    const hasIndividualDbVars = !!(data.DB_USER && data.DB_PASS && data.DB_HOST && data.DB_NAME && data.DB_PORT);
    
    if (!hasDatabaseUrl && !hasIndividualDbVars) {
      return { 
        success: false, 
        errors: ['Database configuration missing. Please set either DATABASE_URL or all DB_* environment variables (DB_USER, DB_PASS, DB_HOST, DB_NAME, DB_PORT).'] 
      };
    }

    // Additional validation and warnings
    if (data.NODE_ENV === 'production') {
      if (!data.NEXTAUTH_URL.startsWith('https://')) {
        warnings.push('NEXTAUTH_URL should use HTTPS in production');
      }
      
      if (data.DATABASE_URL && !data.DATABASE_URL.includes('sslmode=require')) {
        warnings.push('DATABASE_URL should use SSL in production (add ?sslmode=require)');
      }

      if (data.NEXTAUTH_SECRET === data.JWT_SECRET) {
        warnings.push('NEXTAUTH_SECRET and JWT_SECRET should be different in production');
      }

      if (hasIndividualDbVars && !hasDatabaseUrl) {
        warnings.push('Consider using DATABASE_URL instead of individual DB_* variables for production');
      }
    }

    // Check email configuration completeness
    const emailVars = [data.SMTP_HOST, data.SMTP_PORT, data.SMTP_USER, data.SMTP_PASS];
    const hasAnyEmail = emailVars.some(v => v);
    const hasAllEmail = emailVars.every(v => v);
    
    if (hasAnyEmail && !hasAllEmail) {
      warnings.push('Incomplete email configuration - all SMTP variables should be set');
    }

    // Check Google API configuration
    if (data.GOOGLE_API_KEY && !data.GOOGLE_CLIENT_ID) {
      warnings.push('GOOGLE_API_KEY is set but GOOGLE_CLIENT_ID is missing');
    }

    // Check file storage configuration
    const awsVars = [data.AWS_ACCESS_KEY_ID, data.AWS_SECRET_ACCESS_KEY, data.AWS_REGION, data.AWS_S3_BUCKET];
    const hasAnyAws = awsVars.some(v => v);
    const hasAllAws = awsVars.every(v => v);
    
    if (hasAnyAws && !hasAllAws) {
      warnings.push('Incomplete AWS configuration - all AWS variables should be set');
    }

    const gcpVars = [data.GOOGLE_CLOUD_PROJECT_ID, data.GOOGLE_CLOUD_STORAGE_BUCKET];
    const hasAnyGcp = gcpVars.some(v => v);
    const hasAllGcp = gcpVars.every(v => v);
    
    if (hasAnyGcp && !hasAllGcp) {
      warnings.push('Incomplete GCP configuration - all GCP variables should be set');
    }

    return { success: true, data, warnings };
  } catch (error) {
    return { 
      success: false, 
      errors: [`Environment validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`] 
    };
  }
}

/**
 * Get validated environment configuration
 * Throws an error if validation fails
 */
export function getEnvConfig(): EnvConfig {
  const result = validateEnv();
  
  if (!result.success) {
    const errorMessage = [
      'Environment validation failed:',
      ...(result.errors || []),
    ].join('\n  - ');
    
    throw new Error(errorMessage);
  }

  // Log warnings in development
  if (result.warnings && result.warnings.length > 0 && process.env.ENV === 'development') {
    console.warn('Environment warnings:');
    result.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  return result.data!;
}

/**
 * Check if specific features are enabled based on environment
 */
export function getFeatureFlags(config?: EnvConfig): {
  emailEnabled: boolean;
  googleSheetsEnabled: boolean;
  googleDriveEnabled: boolean;
  realtimeEnabled: boolean;
  fileStorageEnabled: boolean;
  monitoringEnabled: boolean;
  debugEnabled: boolean;
} {
  const env = config || getEnvConfig();
  
  return {
    emailEnabled: !!(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS),
    googleSheetsEnabled: !!(env.GOOGLE_API_KEY && env.GOOGLE_CLIENT_ID),
    googleDriveEnabled: !!(env.GOOGLE_API_KEY && env.GOOGLE_CLIENT_ID),
    realtimeEnabled: !!env.NEXT_PUBLIC_WS_URL,
    fileStorageEnabled: !!(
      (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.AWS_REGION && env.AWS_S3_BUCKET) ||
      (env.GOOGLE_CLOUD_PROJECT_ID && env.GOOGLE_CLOUD_STORAGE_BUCKET)
    ),
    monitoringEnabled: !!(env.SENTRY_DSN || env.NEXT_PUBLIC_GA_ID),
    debugEnabled: env.NODE_ENV === 'development' || env.DEBUG === 'true',
  };
}

/**
 * Database connection validation
 */
export async function validateDatabaseConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const { prisma } = await import('./prisma');
    
    await prisma.$connect();
    await prisma.$disconnect();
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Database connection failed' 
    };
  }
}

/**
 * Google OAuth validation
 */
export async function validateGoogleOAuth(): Promise<{ success: boolean; error?: string }> {
  try {
    const config = getEnvConfig();
    
    if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
      return { success: false, error: 'Google OAuth credentials not configured' };
    }

    // Basic format validation
    if (!config.GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com')) {
      return { success: false, error: 'Invalid GOOGLE_CLIENT_ID format' };
    }

    if (!config.GOOGLE_CLIENT_SECRET.startsWith('GOCSPX-')) {
      return { success: false, error: 'Invalid GOOGLE_CLIENT_SECRET format' };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Google OAuth validation failed' 
    };
  }
}

/**
 * SMTP configuration validation
 */
export async function validateSMTPConfig(): Promise<{ success: boolean; error?: string }> {
  try {
    const config = getEnvConfig();
    const features = getFeatureFlags(config);
    
    if (!features.emailEnabled) {
      return { success: false, error: 'SMTP configuration incomplete' };
    }

    // Basic port validation
    const port = parseInt(config.SMTP_PORT!);
    if (isNaN(port) || port < 1 || port > 65535) {
      return { success: false, error: 'Invalid SMTP_PORT' };
    }

    // Common SMTP hosts validation
    const validHosts = ['smtp.gmail.com', 'smtp.sendgrid.net', 'smtp-mail.outlook.com'];
    if (!validHosts.includes(config.SMTP_HOST!) && !config.SMTP_HOST!.includes('smtp')) {
      return { success: false, error: 'SMTP_HOST may be invalid' };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'SMTP validation failed' 
    };
  }
}

/**
 * Comprehensive environment health check
 */
export async function performHealthCheck(): Promise<{
  overall: boolean;
  checks: {
    environment: { success: boolean; errors?: string[]; warnings?: string[] };
    database: { success: boolean; error?: string };
    googleOAuth: { success: boolean; error?: string };
    smtp: { success: boolean; error?: string };
  };
  features: ReturnType<typeof getFeatureFlags>;
}> {
  const envResult = validateEnv();
  const dbResult = await validateDatabaseConnection();
  const oauthResult = await validateGoogleOAuth();
  const smtpResult = await validateSMTPConfig();
  
  const overall = envResult.success && dbResult.success && oauthResult.success;
  
  return {
    overall,
    checks: {
      environment: envResult,
      database: dbResult,
      googleOAuth: oauthResult,
      smtp: smtpResult,
    },
    features: getFeatureFlags(),
  };
}
