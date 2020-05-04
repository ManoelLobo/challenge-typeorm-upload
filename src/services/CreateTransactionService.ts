import { getRepository } from 'typeorm';

// import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  title: string;
  type: 'income' | 'outcome' | undefined;
  value: number;
  categoryTitle: string;
}

class CreateTransactionService {
  public async execute({
    title,
    type,
    value,
    categoryTitle,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getRepository(Transaction);
    const categoriesRepository = getRepository(Category);

    let categoryExists = await categoriesRepository.findOne({
      title: categoryTitle,
    });

    if (!categoryExists) {
      categoryExists = categoriesRepository.create({
        title: categoryTitle,
      });

      await categoriesRepository.save(categoryExists);
    }

    const transaction = transactionsRepository.create({
      title,
      type,
      value,
      category: categoryExists,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
