import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { Product } from '../src/products/entities/product.entity';
import { randomUUID } from 'crypto';

describe('ProductsController (e2e)', () => {
  const uuid = randomUUID();
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get<DataSource>(DataSource);
    await dataSource.getRepository(Product).save({
      id: uuid,
      name: 'Test Product',
      description: 'Test Product Description',
      quantity: '100',
      price: '10',
    });
  });

  afterAll(async () => {
    await dataSource.getRepository(Product).delete({ id: uuid });
    await app.close();
  });

  it('should handle multiple concurrent orders without data inconsistency', async () => {
    const productId = uuid;
    const orderQuantity = 1;
    const numberOfConcurrentOrders = 50;

    const requests = new Array(numberOfConcurrentOrders)
      .fill(0)
      .map(() =>
        request(app.getHttpServer())
          .patch(`/products/${productId}/order`)
          .send({ quantity: orderQuantity }),
      );

    const results = await Promise.allSettled(requests);
    const successfulRequests = results.filter(
      (result) => result.status === 'fulfilled' && result.value.status === 200,
    ).length;

    const product = await dataSource
      .getRepository(Product)
      .findOneBy({ id: productId });

    expect(product.quantity).toEqual(
      (100 - successfulRequests * orderQuantity).toString(),
    );
  });
});
