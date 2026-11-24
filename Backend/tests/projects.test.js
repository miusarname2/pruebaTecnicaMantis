import request from 'supertest';
import app from '../src/app.js';

const STAFF = 'Bearer staff-token';
const ACME  = 'Bearer acme-token';
const BRICK = 'Bearer brick-token';

describe('Rule 2: internal block is stripped', () => {
  test('project list never contains internal fields', async () => {
    const res = await request(app).get('/api/projects').set('Authorization', STAFF);
    expect(res.status).toBe(200);
    res.body.forEach((p) => {
      expect(p).not.toHaveProperty('internal');
      expect(p).not.toHaveProperty('price');
      expect(p).not.toHaveProperty('invoice');
      expect(p).not.toHaveProperty('margin');
    });
  });

  test('project detail never contains internal (staff)', async () => {
    const res = await request(app).get('/api/projects/1201-30001').set('Authorization', STAFF);
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('internal');
  });

  test('project detail never contains internal (client)', async () => {
    const res = await request(app).get('/api/projects/1201-30001').set('Authorization', ACME);
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('internal');
  });
});

describe('Rule 3: contact filtering by role', () => {
  test('staff sees full contacts (email + phone)', async () => {
    const res = await request(app).get('/api/projects/1201-30001').set('Authorization', STAFF);
    expect(res.status).toBe(200);
    const c = res.body.contacts[0];
    expect(c).toHaveProperty('email');
    expect(c).toHaveProperty('phone');
    expect(c).toHaveProperty('name');
  });

  test('client does NOT see email or phone', async () => {
    const res = await request(app).get('/api/projects/1201-30001').set('Authorization', ACME);
    expect(res.status).toBe(200);
    const c = res.body.contacts[0];
    expect(c).not.toHaveProperty('email');
    expect(c).not.toHaveProperty('phone');
    expect(c).toHaveProperty('name');
    expect(c).toHaveProperty('role');
  });
});

describe('Rule 4: foreign project === non-existent', () => {
  test('acme requesting brick project → 404', async () => {
    const res = await request(app).get('/api/projects/0980-41007').set('Authorization', ACME);
    expect(res.status).toBe(404);
  });

  test('truly non-existent project → 404', async () => {
    const res = await request(app).get('/api/projects/9999-99999').set('Authorization', ACME);
    expect(res.status).toBe(404);
  });

  test('responses are byte-identical (no information leak)', async () => {
    const foreign = await request(app).get('/api/projects/0980-41007').set('Authorization', ACME);
    const missing = await request(app).get('/api/projects/9999-99999').set('Authorization', ACME);
    expect(foreign.status).toBe(missing.status);
    expect(foreign.body).toEqual(missing.body);
  });

  test('foreign project spaces → 404', async () => {
    const res = await request(app).get('/api/projects/0980-41007/spaces').set('Authorization', ACME);
    expect(res.status).toBe(404);
  });

  test('foreign project cloud → 404', async () => {
    const res = await request(app).get('/api/projects/0980-41007/cloud').set('Authorization', ACME);
    expect(res.status).toBe(404);
  });
});

describe('Rule 5: bad input → 4xx', () => {
  test('malformed project ID → 400', async () => {
    const res = await request(app).get('/api/projects/not-an-id').set('Authorization', STAFF);
    expect(res.status).toBe(400);
  });

  test('path-traversal attempt → 400', async () => {
    const res = await request(app).get('/api/projects/../../etc').set('Authorization', STAFF);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  test('valid format but non-existent → 404 (not 500)', async () => {
    const res = await request(app).get('/api/projects/0000-00000').set('Authorization', STAFF);
    expect(res.status).toBe(404);
  });
});

describe('Rule 6: ETag and conditional requests', () => {
  test('detail returns ETag header', async () => {
    const res = await request(app).get('/api/projects/1201-30001').set('Authorization', STAFF);
    expect(res.status).toBe(200);
    expect(res.headers.etag).toBeDefined();
  });

  test('Cache-Control is private', async () => {
    const res = await request(app).get('/api/projects/1201-30001').set('Authorization', STAFF);
    expect(res.headers['cache-control']).toContain('private');
  });

  test('If-None-Match with matching ETag → 304', async () => {
    const first = await request(app).get('/api/projects/1201-30001').set('Authorization', STAFF);
    const etag = first.headers.etag;

    const second = await request(app)
      .get('/api/projects/1201-30001')
      .set('Authorization', STAFF)
      .set('If-None-Match', etag);
    expect(second.status).toBe(304);
  });

  test('different roles produce different ETags', async () => {
    const staff  = await request(app).get('/api/projects/1201-30001').set('Authorization', STAFF);
    const client = await request(app).get('/api/projects/1201-30001').set('Authorization', ACME);
    expect(staff.headers.etag).not.toBe(client.headers.etag);
  });
});

describe('Rule 7: Range / cloud', () => {
  test('project without cloud → 404', async () => {
    const res = await request(app).get('/api/projects/0980-41007/cloud').set('Authorization', STAFF);
    expect(res.status).toBe(404);
  });

  test('full download → 200 with Accept-Ranges', async () => {
    const res = await request(app).get('/api/projects/1201-30001/cloud').set('Authorization', STAFF);
    expect(res.status).toBe(200);
    expect(res.headers['accept-ranges']).toBe('bytes');
    expect(res.headers['content-length']).toBeDefined();
  });

  test('Range: bytes=0-15 → 206 with 16 bytes', async () => {
    const res = await request(app)
      .get('/api/projects/1201-30001/cloud')
      .set('Authorization', STAFF)
      .set('Range', 'bytes=0-15');
    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toMatch(/^bytes 0-15\//);
    expect(parseInt(res.headers['content-length'], 10)).toBe(16);
  });
});

describe('Project listing by role', () => {
  test('staff sees all 3 projects', async () => {
    const res = await request(app).get('/api/projects').set('Authorization', STAFF);
    expect(res.body).toHaveLength(3);
  });

  test('acme sees only their 2 projects', async () => {
    const res = await request(app).get('/api/projects').set('Authorization', ACME);
    expect(res.body).toHaveLength(2);
    res.body.forEach((p) => expect(['1201-30001', '1201-30002']).toContain(p.id));
  });

  test('brick sees only their 1 project', async () => {
    const res = await request(app).get('/api/projects').set('Authorization', BRICK);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('0980-41007');
  });

  test('list items have the expected shape', async () => {
    const res = await request(app).get('/api/projects').set('Authorization', STAFF);
    const p = res.body[0];
    expect(p).toHaveProperty('id');
    expect(p).toHaveProperty('name');
    expect(p).toHaveProperty('address');
    expect(p).toHaveProperty('status');
    expect(p).toHaveProperty('clientName');
    expect(p).not.toHaveProperty('client');
    expect(p).not.toHaveProperty('dates');
    expect(p).not.toHaveProperty('levels');
  });
});
