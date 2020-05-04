import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();

    return transactions.reduce(
      (aggregated, current) => {
        switch (current.type) {
          case 'income':
            return {
              ...aggregated,
              income: aggregated.income + current.value,
              total: aggregated.total + current.value,
            };

          case 'outcome':
            return {
              ...aggregated,
              outcome: aggregated.outcome + current.value,
              total: aggregated.total - current.value,
            };

          default:
            return aggregated;
        }
      },
      { income: 0, outcome: 0, total: 0 },
    );
  }
}

export default TransactionsRepository;
