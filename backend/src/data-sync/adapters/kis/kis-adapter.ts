import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { format, subDays } from 'date-fns';
import { KisAuthService } from './kis-auth.service';
import {
  CurrentPriceDto,
  DailyInvestorDto,
  MarketDataPort,
  OhlcvDto,
} from '../market-data.port';
import {
  KisCurrentPriceResponse,
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
            FID_ORG_ADJ_PRC: '1',
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
      changeRate: (() => {
        const isDown = ['4', '5'].includes(item.prdy_vrss_sign);
        const rate = Number(item.prdy_ctrt);
        return isDown ? -rate : rate;
      })(),
    }));
  }

  async fetchStockInfo(ticker: string): Promise<{ name: string } | null> {
    const today = format(new Date(), 'yyyyMMdd');
    const fiveDaysAgo = format(subDays(new Date(), 5), 'yyyyMMdd');

    try {
      const priceHeaders = await this.headers('FHKST03010100');
      const { data } = await firstValueFrom(
        this.httpService.get<KisDailyPriceResponse>(
          `${this.baseUrl}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`,
          {
            headers: priceHeaders,
            params: {
              FID_COND_MRKT_DIV_CODE: 'J',
              FID_INPUT_ISCD: ticker,
              FID_INPUT_DATE_1: fiveDaysAgo,
              FID_INPUT_DATE_2: today,
              FID_PERIOD_DIV_CODE: 'D',
              FID_ORG_ADJ_PRC: '1',
            },
          },
        ),
      );
      const name = data.rt_cd === '0' ? (data.output1?.hts_kor_isnm ?? null) : null;
      return name ? { name } : null;
    } catch {
      return null;
    }
  }

  async fetchInvestorTradeDailyByStock(
    ticker: string,
    from: Date,
    to: Date,
  ): Promise<DailyInvestorDto[]> {
    const url = `${this.baseUrl}/uapi/domestic-stock/v1/quotations/investor-trade-by-stock-daily`;
    this.logger.log(`외인 일별 투자자 요청: ${ticker}`);

    let lastErr: unknown;
    for (const marketCode of ['J', 'Q'] as const) {
      try {
        const headers = await this.headers('FHPTJ04160001');
        const { data } = await firstValueFrom(
          this.httpService.get<KisInvestorTradeByStockResponse>(url, {
            headers,
            params: {
              FID_COND_MRKT_DIV_CODE: marketCode,
              FID_INPUT_ISCD: ticker,
              FID_INPUT_DATE_1: format(to, 'yyyyMMdd'),
              FID_INPUT_DATE_2: format(to, 'yyyyMMdd'),
              FID_ORG_ADJ_PRC: '0',
              FID_ETC_CLS_CODE: '00',
            },
          }),
        );

        const rows = data.output2 ?? [];
        if (rows.length > 0) {
          return rows.map((item) => ({
            date: `${item.stck_bsop_date.slice(0, 4)}-${item.stck_bsop_date.slice(4, 6)}-${item.stck_bsop_date.slice(6, 8)}`,
            foreignNetBuy: Number(item.frgn_ntby_qty),
          }));
        }
      } catch (err) {
        const axiosErr = err as AxiosError;
        this.logger.warn(
          `외인 투자자 API 시도 실패 [${ticker}] [${marketCode}] [${axiosErr.response?.status}]`,
        );
        lastErr = err;
      }
    }

    this.logger.error(`외인 투자자 API 모든 시장 코드 실패: ${ticker}`);
    throw lastErr ?? new Error(`외인 투자자 API 실패: ${ticker}`);
  }

  async fetchCurrentPrice(ticker: string): Promise<CurrentPriceDto> {
    const headers = await this.headers('FHKST01010100');
    const { data } = await firstValueFrom(
      this.httpService.get<KisCurrentPriceResponse>(
        `${this.baseUrl}/uapi/domestic-stock/v1/quotations/inquire-price`,
        {
          headers,
          params: {
            FID_COND_MRKT_DIV_CODE: 'J',
            FID_INPUT_ISCD: ticker,
          },
        },
      ),
    );

    const isDown = ['4', '5'].includes(data.output.prdy_vrss_sign.trim());
    const rate = Math.abs(Number(data.output.prdy_ctrt));
    return {
      price: Number(data.output.stck_prpr),
      changeRate: isDown ? -rate : rate,
    };
  }
}
