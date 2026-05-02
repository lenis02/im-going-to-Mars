import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('stock_master')
export class StockMaster {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 10, unique: true })
  ticker: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 20 })
  market: string;
}
