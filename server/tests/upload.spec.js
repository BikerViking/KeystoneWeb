import request from 'supertest';
import app from '../server.js';

describe('POST /api/upload', () => {
  it('uploads files locally in demo mode', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('files', Buffer.from('test'), 'test.txt');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
    expect(res.body).toHaveProperty('target', 'local');
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0]).toHaveProperty('name', 'test.txt');
  });

  it('rejects when no files provided', async () => {
    const res = await request(app)
      .post('/api/upload')
      .field('dummy', '1');
    expect(res.status).toBe(400);
  });

  it('rejects disallowed mime types', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('files', Buffer.from('bad'), 'bad.exe');
    expect(res.status).toBe(400);
  });

  it('rejects files that exceed size limits', async () => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 1, 0);
    const res = await request(app)
      .post('/api/upload')
      .attach('files', big, 'big.txt');
    expect(res.status).toBe(400);
  });
});
