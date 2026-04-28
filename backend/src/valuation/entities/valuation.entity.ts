import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Stock } from '../../stock/entities/stock.entity';

@Entity('valuation')
@Unique(['stock', 'date'])
export class Valuation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Stock, { nullable: false, onDelete: 'CASCADE' })
  stock: Stock;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'numeric', precision: 18, scale: 4, nullable: true })
  pbr: number | null;

  @Column({ type: 'numeric', precision: 18, scale: 4, nullable: true })
  per: number | null;
}
