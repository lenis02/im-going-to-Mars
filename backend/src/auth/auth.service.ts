import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from './entities/user.entity';

interface GoogleProfile {
  googleId: string;
  email: string;
  displayName: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async findOrCreate(profile: GoogleProfile): Promise<User> {
    let user = await this.userRepo.findOneBy({ googleId: profile.googleId });
    if (!user) {
      user = this.userRepo.create(profile);
      user = await this.userRepo.save(user);
    }
    return user;
  }

  findById(id: number): Promise<User | null> {
    return this.userRepo.findOneBy({ id });
  }

  generateToken(user: User): string {
    return this.jwtService.sign({ sub: user.id, email: user.email });
  }
}
