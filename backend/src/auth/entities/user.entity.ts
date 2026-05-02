import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 255 })
  googleId: string;

  @Column({ length: 255 })
  email: string;

  @Column({ length: 255 })
  displayName: string;
}
