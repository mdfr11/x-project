import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    return await this.productsRepository.save(createProductDto);
  }

  async findAll(): Promise<Product[]> {
    return await this.productsRepository.find();
  }

  async findOne(id: string): Promise<Product | undefined> {
    return await this.productsRepository.findOneBy({ id });
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    await this.productsRepository.update(id, updateProductDto);
    return this.productsRepository.findOneBy({ id });
  }

  async remove(id: string): Promise<void> {
    await this.productsRepository.delete(id);
  }

  async updateProductQuantity(
    id: string,
    quantityToDeduct: string,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const product = await queryRunner.manager.findOne(Product, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      const productQuantity = Number(product.quantity);
      const quantityToDeductAsNumber = Number(quantityToDeduct);

      const totalQuantity = productQuantity - quantityToDeductAsNumber;

      if (totalQuantity < 0) {
        throw new BadRequestException('Insufficient product quantity');
      }

      product.quantity = totalQuantity.toString();

      await queryRunner.manager.save(product);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
