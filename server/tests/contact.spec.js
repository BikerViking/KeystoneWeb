import request from 'supertest';
import app from '../server.js';

describe('POST /api/contact', () => {
  it('returns ok when provided required fields', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ name: 'Test User', email: 'test@example.com', message: 'Hello' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
  });

  it('rejects missing fields', async () => {
    const res = await request(app).post('/api/contact').send({});
    expect(res.status).toBe(400);
  });
});
