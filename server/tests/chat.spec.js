import request from 'supertest';
import app from '../server.js';

describe('POST /api/chat', () => {
  it('provides a demo reply without API key', async () => {
    const res = await request(app).post('/api/chat').send({ message: 'Hello' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('reply');
    expect(res.body.reply).toMatch(/Keystone Notary demo assistant/);
  });
});
