import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { OpenaiBriefClient } from './../src/brief/openai-brief.client';
import {
  BRIEF_OUTPUT_SCHEMA_VERSION,
  type BriefOutput,
} from './../src/brief/brief-output.types';

const mockOpenAiResponse = JSON.stringify({
  schemaVersion: BRIEF_OUTPUT_SCHEMA_VERSION,
  summary: 'Login for managers',
  workItems: [
    {
      id: '1',
      parentId: null,
      type: 'story',
      title: 'Manager login',
      description: 'Build login page',
      acceptanceCriteria: [
        {
          text: 'Managers have a login page',
          evidenceQuote: 'login page for managers',
          status: 'stated',
        },
      ],
    },
  ],
  gaps: ['Which authentication provider?'],
});

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OpenaiBriefClient)
      .useValue({
        completeJson: jest.fn().mockResolvedValue(mockOpenAiResponse),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/briefs/transform (POST) returns structured output', async () => {
    const res = await request(app.getHttpServer())
      .post('/briefs/transform')
      .send({ text: 'We need a login page for managers.' })
      .expect(201);

    const body = res.body as BriefOutput;
    expect(body.workItems).toHaveLength(1);
    expect(body.gaps).toContain('Which authentication provider?');
    expect(body.schemaVersion).toBe(BRIEF_OUTPUT_SCHEMA_VERSION);
  });

  it('/briefs/transform (POST) validates body', () => {
    return request(app.getHttpServer())
      .post('/briefs/transform')
      .send({ text: '' })
      .expect(400);
  });

  afterEach(async () => {
    await app.close();
  });
});
