import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('stock')
@Unique(['ticker', 'userId'])
export class Stock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 10 })
  ticker: string;

  @Column({ length: 100 })
  name: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ name: 'userId' })
  userId: number;
}
