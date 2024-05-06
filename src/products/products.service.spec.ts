import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let productsRepository: Repository<Product>;
  let dataSource: DataSource;

  beforeEach(async () => {
    const managerMock = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const queryRunnerMock = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      manager: managerMock,
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    };

    const dataSourceMock = {
      createQueryRunner: jest.fn(() => queryRunnerMock),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useClass: Repository,
        },
        {
          provide: DataSource,
          useValue: dataSourceMock,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    dataSource = module.get<DataSource>(DataSource);
    productsRepository = module.get<Repository<Product>>(
      getRepositoryToken(Product),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should successfully deduct quantity of the product', async () => {
    const productId = 'valid-id';
    const initialQuantity = 100;
    const quantityToDeduct = 20;

    (dataSource.createQueryRunner().manager.findOne as any).mockResolvedValue({
      id: productId,
      quantity: initialQuantity.toString(),
    });

    await service.updateProductQuantity(productId, quantityToDeduct.toString());

    expect(dataSource.createQueryRunner().manager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: (initialQuantity - quantityToDeduct).toString(),
      }),
    );
  });

  it('should throw BadRequestException if insufficient product quantity', async () => {
    const productId = 'valid-id';
    const initialQuantity = 10;
    const quantityToDeduct = 15;

    (dataSource.createQueryRunner().manager.findOne as any).mockResolvedValue({
      id: productId,
      quantity: initialQuantity.toString(),
    });

    await expect(
      service.updateProductQuantity(productId, quantityToDeduct.toString()),
    ).rejects.toThrow(BadRequestException);
  });
});
