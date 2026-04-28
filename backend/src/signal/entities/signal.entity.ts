import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Stock } from '../../stock/entities/stock.entity';

export enum SignalType {
  ENTRY = 'ENTRY',
  EXIT = 'EXIT',
}

@Entity('signal')
export class Signal {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Stock, { nullable: false, onDelete: 'CASCADE' })
  stock: Stock;

  @Column({ type: 'enum', enum: SignalType })
  type: SignalType;

  @Column({ type: 'numeric', precision: 18, scale: 4 })
  price: number;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn()
  triggeredAt: Date;
}
