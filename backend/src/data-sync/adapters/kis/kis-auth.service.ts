import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { KisTokenResponse } from './kis.types';

@Injectable()
export class KisAuthService {
  private readonly logger = new Logger(KisAuthService.name);
  private accessToken: string | null = null;
  private expiresAt: number = 0;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.expiresAt) {
      return this.accessToken;
    }
    return this.fetchToken();
  }

  private async fetchToken(): Promise<string> {
    const baseUrl = this.configService.get<string>('KIS_BASE_URL');
    const appKey = this.configService.get<string>('KIS_APP_KEY');
    const appSecret = this.configService.get<string>('KIS_APP_SECRET');

    const { data } = await firstValueFrom(
      this.httpService.post<KisTokenResponse>(`${baseUrl}/oauth2/tokenP`, {
        grant_type: 'client_credentials',
        appkey: appKey,
        appsecret: appSecret,
      }),
    );

    this.accessToken = data.access_token;
    this.expiresAt = Date.now() + (data.expires_in - 60) * 1000;
    this.logger.log('KIS 액세스 토큰 갱신 완료');

    return this.accessToken;
  }
}
