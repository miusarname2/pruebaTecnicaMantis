import request from 'supertest';
import app from '../src/app.js';

const STAFF = 'Bearer staff-token';
const ACME  = 'Bearer acme-token';

const ENDPOINT = '/api/projects/1201-30001/issues';

describe('POST /api/projects/:id/issues', () => {
  test('valid issue → 201 with { id }', async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set('Authorization', STAFF)
      .send({ title: 'Crack in wall', level: 'Level 1' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(typeof res.body.id).toBe('string');
  });

  test('valid issue with spaceId → 201', async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set('Authorization', STAFF)
      .send({ title: 'Water stain', level: 'Level 1', spaceId: 's1' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  test('client can create issue on own project → 201', async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set('Authorization', ACME)
      .send({ title: 'Door misaligned', level: 'Level 2' });
    expect(res.status).toBe(201);
  });

  test('missing title → 400', async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set('Authorization', STAFF)
      .send({ level: 'Level 1' });
    expect(res.status).toBe(400);
  });

  test('empty title → 400', async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set('Authorization', STAFF)
      .send({ title: '', level: 'Level 1' });
    expect(res.status).toBe(400);
  });

  test('whitespace-only title → 400', async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set('Authorization', STAFF)
      .send({ title: '   ', level: 'Level 1' });
    expect(res.status).toBe(400);
  });

  test('title > 120 characters → 400', async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set('Authorization', STAFF)
      .send({ title: 'A'.repeat(121), level: 'Level 1' });
    expect(res.status).toBe(400);
  });

  test('title exactly 120 characters → 201', async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set('Authorization', STAFF)
      .send({ title: 'B'.repeat(120), level: 'Level 1' });
    expect(res.status).toBe(201);
  });

  test('missing level → 400', async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set('Authorization', STAFF)
      .send({ title: 'Something' });
    expect(res.status).toBe(400);
  });

  test('non-existent level → 400', async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set('Authorization', STAFF)
      .send({ title: 'Something', level: 'Level 99' });
    expect(res.status).toBe(400);
  });

  test('invalid spaceId → 400', async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set('Authorization', STAFF)
      .send({ title: 'Something', level: 'Level 1', spaceId: 'nonexistent' });
    expect(res.status).toBe(400);
  });

  test('spaceId as number → 400', async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set('Authorization', STAFF)
      .send({ title: 'Something', level: 'Level 1', spaceId: 42 });
    expect(res.status).toBe(400);
  });

  test('client on foreign project → 404', async () => {
    const res = await request(app)
      .post('/api/projects/0980-41007/issues')
      .set('Authorization', ACME)
      .send({ title: 'Sneaky', level: 'Level 1' });
    expect(res.status).toBe(404);
  });

  test('broken JSON → 400', async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set('Authorization', STAFF)
      .type('json')
      .send('{ this is not json }');
    expect(res.status).toBe(400);
  });
});
