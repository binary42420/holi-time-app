/**
 * @jest-environment node
 */

const fetch = require('node-fetch');

describe('Critical Functionality Tests', () => {
  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  // Test 1: Basic API Health Check
  test('should return 200 OK for the health check endpoint', async () => {
    const response = await fetch(`${BASE_URL}/api/health`);
    expect(response.status).toBe(200);
  });

  // Test 2: Database Health Check
  test('should confirm database connectivity', async () => {
    const response = await fetch(`${BASE_URL}/api/debug/db-health`);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
  });

  // Test 3: Protected Route Access
  test('should deny access to a protected route without authentication', async () => {
    const response = await fetch(`${BASE_URL}/api/companies`);
    // Depending on the auth setup, this could be 401, 403, or a redirect (302)
    expect([401, 403, 302]).toContain(response.status);
  });

  // Test 4: Non-existent API endpoint
  test('should return 404 for a non-existent API endpoint', async () => {
    const response = await fetch(`${BASE_URL}/api/this-does-not-exist`);
    expect(response.status).toBe(404);
  });
});