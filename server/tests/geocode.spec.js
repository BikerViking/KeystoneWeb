import request from 'supertest';
import app from '../server.js';

describe('GET /api/geocode', () => {
  it('returns demo coordinates when query provided', async () => {
    const res = await request(app)
      .get('/api/geocode')
      .query({ q: '1600 Pennsylvania Ave' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
    expect(typeof res.body.lat).toBe('number');
    expect(typeof res.body.lon).toBe('number');
    expect(res.body.label).toMatch(/demo/);
  });

  it('rejects missing query', async () => {
    const res = await request(app).get('/api/geocode');
    expect(res.status).toBe(400);
  });
});
