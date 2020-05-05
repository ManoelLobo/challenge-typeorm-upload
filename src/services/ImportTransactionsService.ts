import { getRepository, getCustomRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';

import uploadConfig from '../config/upload';

import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface TransactionData {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  categoryTitle: string;
}

class ImportTransactionsService {
  async execute(fileName: string): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const csvFilePath = path.join(uploadConfig.storagePath, fileName);

    const readCSVStream = fs.createReadStream(csvFilePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const transactionsData: TransactionData[] = [];
    const categoryTitles: string[] = [];

    parseCSV.on('data', ([title, type, value, categoryTitle]) => {
      const transactionData = {
        title,
        type,
        value,
        categoryTitle,
      };

      transactionsData.push(transactionData);
      categoryTitles.push(categoryTitle);
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    const existingCategories = await categoriesRepository.find({
      where: { title: In(categoryTitles) },
    });

    const existingCategoriesTitles = existingCategories.map(
      category => category.title,
    );

    const newCategoriesTitles = Array.from(
      new Set(
        categoryTitles.filter(
          title => !existingCategoriesTitles.includes(title),
        ),
      ),
    );

    const newCategories = categoriesRepository.create(
      newCategoriesTitles.map(title => ({ title })),
    );

    await categoriesRepository.save(newCategories);

    const allCategories = [...existingCategories, ...newCategories];

    const transactions = transactionsRepository.create(
      transactionsData.map(({ title, type, value, categoryTitle }) => ({
        title,
        type,
        value,
        category: allCategories.find(
          category => category.title === categoryTitle,
        ),
      })),
    );

    await transactionsRepository.save(transactions);

    await fs.promises.unlink(csvFilePath);

    return transactions;
  }
}

export default ImportTransactionsService;
