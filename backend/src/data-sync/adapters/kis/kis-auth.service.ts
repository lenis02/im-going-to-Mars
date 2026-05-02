import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { KisTokenResponse } from './kis.types';

@Injectable()
export class KisAuthService {
  private readonly logger = new Logger(KisAuthService.name);
  private accessToken: string | null = null;
  private expiresAt: number = 0;
  private tokenPromise: Promise<string> | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.expiresAt) {
      return this.accessToken;
    }
    if (!this.tokenPromise) {
      this.tokenPromise = this.fetchToken().finally(() => {
        this.tokenPromise = null;
      });
    }
    return this.tokenPromise;
  }

  private async fetchToken(): Promise<string> {
    const baseUrl = this.configService.get<string>('KIS_BASE_URL');
    const appKey = this.configService.get<string>('KIS_APP_KEY');
    const appSecret = this.configService.get<string>('KIS_APP_SECRET');

    this.logger.log(`토큰 요청: POST ${baseUrl}/oauth2/tokenP`);

    try {
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
    } catch (err) {
      const axiosErr = err as AxiosError;
      this.logger.error(
        `토큰 발급 실패 [${axiosErr.response?.status ?? axiosErr.code}]`,
      );
      throw err;
    }
  }
}
