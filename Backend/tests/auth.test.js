import request from 'supertest';
import app from '../src/app.js';

describe('Authentication (Rule 1)', () => {
  test('request without token → 401', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  test('invalid token → 401', async () => {
    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', 'Bearer totally-wrong');
    expect(res.status).toBe(401);
  });

  test('missing "Bearer " prefix → 401', async () => {
    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', 'staff-token');
    expect(res.status).toBe(401);
  });

  test('empty Bearer value → 401', async () => {
    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', 'Bearer ');
    expect(res.status).toBe(401);
  });

  test('valid staff token → 200', async () => {
    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', 'Bearer staff-token');
    expect(res.status).toBe(200);
  });

  test('valid client token → 200', async () => {
    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', 'Bearer acme-token');
    expect(res.status).toBe(200);
  });
});
