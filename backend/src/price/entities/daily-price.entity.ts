import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Stock } from '../../stock/entities/stock.entity';

@Entity('daily_price')
@Unique(['stock', 'date'])
export class DailyPrice {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Stock, { nullable: false, onDelete: 'CASCADE' })
  stock: Stock;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'numeric', precision: 18, scale: 4 })
  open: number;

  @Column({ type: 'numeric', precision: 18, scale: 4 })
  high: number;

  @Column({ type: 'numeric', precision: 18, scale: 4 })
  low: number;

  @Column({ type: 'numeric', precision: 18, scale: 4 })
  close: number;

  @Column({ type: 'bigint' })
  volume: number;

  @Column({ type: 'bigint', default: 0 })
  foreignNetBuy: number;

  @Column({ type: 'numeric', precision: 8, scale: 4, default: 0 })
  changeRate: number;
}
