import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { format, subDays } from 'date-fns';
import { KisAuthService } from './kis-auth.service';
import {
  DailyInvestorDto,
  MarketDataPort,
  OhlcvDto,
} from '../market-data.port';
import {
  KisDailyPriceResponse,
  KisInvestorTradeByStockResponse,
} from './kis.types';

@Injectable()
export class KisAdapter implements MarketDataPort {
  private readonly logger = new Logger(KisAdapter.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly authService: KisAuthService,
    private readonly configService: ConfigService,
  ) {}

  private get baseUrl(): string {
    return this.configService.get<string>('KIS_BASE_URL') ?? '';
  }

  private async headers(trId: string): Promise<Record<string, string>> {
    const token = await this.authService.getAccessToken();
    return {
      authorization: `Bearer ${token}`,
      appkey: this.configService.get<string>('KIS_APP_KEY') ?? '',
      appsecret: this.configService.get<string>('KIS_APP_SECRET') ?? '',
      tr_id: trId,
      'content-type': 'application/json',
    };
  }

  async fetchDailyPrices(
    ticker: string,
    from: Date,
    to: Date,
  ): Promise<OhlcvDto[]> {
    const headers = await this.headers('FHKST03010100');
    const { data } = await firstValueFrom(
      this.httpService.get<KisDailyPriceResponse>(
        `${this.baseUrl}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`,
        {
          headers,
          params: {
            FID_COND_MRKT_DIV_CODE: 'J',
            FID_INPUT_ISCD: ticker,
            FID_INPUT_DATE_1: format(from, 'yyyyMMdd'),
            FID_INPUT_DATE_2: format(to, 'yyyyMMdd'),
            FID_PERIOD_DIV_CODE: 'D',
            FID_ORG_ADJ_PRC: '0',
          },
        },
      ),
    );

    return (data.output2 ?? []).map((item) => ({
      date: `${item.stck_bsop_date.slice(0, 4)}-${item.stck_bsop_date.slice(4, 6)}-${item.stck_bsop_date.slice(6, 8)}`,
      open: Number(item.stck_oprc),
      high: Number(item.stck_hgpr),
      low: Number(item.stck_lwpr),
      close: Number(item.stck_clpr),
      volume: Number(item.acml_vol),
    }));
  }

  async fetchStockInfo(
    ticker: string,
  ): Promise<{ name: string; market: 'KOSPI' | 'KOSDAQ' } | null> {
    const today = format(new Date(), 'yyyyMMdd');
    const yesterday = format(subDays(new Date(), 5), 'yyyyMMdd');

    for (const market of ['J', 'Q'] as const) {
      try {
        const headers = await this.headers('FHKST03010100');
        const { data } = await firstValueFrom(
          this.httpService.get<KisDailyPriceResponse>(
            `${this.baseUrl}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`,
            {
              headers,
              params: {
                FID_COND_MRKT_DIV_CODE: market,
                FID_INPUT_ISCD: ticker,
                FID_INPUT_DATE_1: yesterday,
                FID_INPUT_DATE_2: today,
                FID_PERIOD_DIV_CODE: 'D',
                FID_ORG_ADJ_PRC: '0',
              },
            },
          ),
        );

        if (data.rt_cd === '0' && data.output1?.hts_kor_isnm) {
          return {
            name: data.output1.hts_kor_isnm,
            market: market === 'J' ? 'KOSPI' : 'KOSDAQ',
          };
        }
      } catch {
        // 다음 시장 시도
      }
    }

    return null;
  }

  async fetchInvestorTradeDailyByStock(
    ticker: string,
    market: 'J' | 'Q',
    from: Date,
    to: Date,
  ): Promise<DailyInvestorDto[]> {
    const headers = await this.headers('FHPTJ04160001');
    const url = `${this.baseUrl}/uapi/domestic-stock/v1/quotations/investor-trade-by-stock-daily`;

    this.logger.log(`외인 일별 투자자 요청: ${ticker} (${market})`);

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<KisInvestorTradeByStockResponse>(url, {
          headers,
          params: {
            FID_COND_MRKT_DIV_CODE: market,
            FID_INPUT_ISCD: ticker,
            FID_INPUT_DATE_1: format(to, 'yyyyMMdd'),
            FID_INPUT_DATE_2: format(to, 'yyyyMMdd'),
            FID_ORG_ADJ_PRC: '0',
            FID_ETC_CLS_CODE: '00',
          },
        }),
      );

      return (data.output2 ?? []).map((item) => ({
        date: `${item.stck_bsop_date.slice(0, 4)}-${item.stck_bsop_date.slice(4, 6)}-${item.stck_bsop_date.slice(6, 8)}`,
        foreignNetBuy: Number(item.frgn_ntby_qty),
      }));
    } catch (err) {
      const axiosErr = err as AxiosError;
      this.logger.error(
        `외인 투자자 API 실패 [${ticker}] [${axiosErr.response?.status}]: ${JSON.stringify(axiosErr.response?.data)}`,
      );
      throw err;
    }
  }
}
