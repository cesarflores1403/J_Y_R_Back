const request = require('supertest');
const app = require('../src/server');

describe('API Tests', () => {
  test('GET / should return status 200', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body.message).toBeDefined();
  });

  test('GET /notfound should return 404', async () => {
    const response = await request(app).get('/notfound');
    expect(response.status).toBe(404);
  });
});
