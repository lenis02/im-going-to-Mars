import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

export enum Market {
  KOSPI = 'KOSPI',
  KOSDAQ = 'KOSDAQ',
}

@Entity('stock')
export class Stock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 10 })
  ticker: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'enum', enum: Market })
  market: Market;
}
