import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';

@Controller('auth')
@SkipThrottle()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  googleCallback(@Req() req: { user: User }, @Res() res: Response) {
    const token = this.authService.generateToken(req.user);
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    res.redirect(`${frontendUrl}?token=${token}`);
  }
}
