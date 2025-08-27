import { jest } from '@jest/globals';
import request from 'supertest';

describe('Calendar event description', () => {
  it('includes uploaded file links when provided', async () => {
    const insertMock = jest.fn().mockResolvedValue({ data: {} });

    await jest.unstable_mockModule('googleapis', () => ({
      google: {
        auth: { JWT: jest.fn().mockImplementation(() => ({}) ) },
        calendar: jest.fn().mockReturnValue({ events: { insert: insertMock } }),
        sheets: jest.fn().mockReturnValue({})
      }
    }));

    process.env.CALENDAR_ID = 'calendar-test-id';
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = JSON.stringify({ client_email: 'a', private_key: 'b' });

    const { default: app } = await import('../server.js');
    const uploads = ['https://example.com/doc1.pdf', 'https://example.com/doc2.pdf'];
    const res = await request(app)
      .post('/api/contact')
      .send({ name: 'Tester', email: 't@example.com', message: 'Hi', uploads });

    expect(res.status).toBe(200);
    expect(insertMock).toHaveBeenCalled();
    const { description } = insertMock.mock.calls[0][0].requestBody;
    for (const url of uploads) {
      expect(description).toContain(url);
    }
  });
});
