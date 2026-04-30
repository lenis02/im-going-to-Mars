import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('stock')
export class Stock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 10 })
  ticker: string;

  @Column({ length: 100 })
  name: string;
}
