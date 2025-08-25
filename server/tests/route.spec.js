import request from 'supertest';
import app from '../server.js';

describe('GET /api/route', () => {
  it('returns demo distance and ETA when lat/lon provided', async () => {
    const res = await request(app)
      .get('/api/route')
      .query({ lat: 40.6, lon: -75.3 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
    expect(typeof res.body.miles).toBe('number');
    expect(typeof res.body.minutes).toBe('number');
  });

  it('rejects when coordinates missing', async () => {
    const res = await request(app)
      .get('/api/route')
      .query({ lat: 40.6 });
    expect(res.status).toBe(400);
  });
});
