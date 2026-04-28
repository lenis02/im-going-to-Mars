import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { format, subDays } from 'date-fns';
import { KisAuthService } from './kis-auth.service';
import {
  ForeignRankingDto,
  MarketDataPort,
  OhlcvDto,
} from '../market-data.port';
import { KisDailyPriceResponse, KisForeignRankingResponse } from './kis.types';

@Injectable()
export class KisAdapter implements MarketDataPort {
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

  async fetchForeignNetBuyRanking(
    market: 'J' | 'Q',
    days: number,
  ): Promise<ForeignRankingDto[]> {
    const headers = await this.headers('FHPST01710000');
    const to = new Date();
    const from = subDays(to, days);

    const { data } = await firstValueFrom(
      this.httpService.get<KisForeignRankingResponse>(
        `${this.baseUrl}/uapi/domestic-stock/v1/ranking/investor`,
        {
          headers,
          params: {
            FID_COND_MRKT_DIV_CODE: market,
            FID_COND_SCR_DIV_CODE: '20171',
            FID_INPUT_ISCD: '0000',
            FID_DIV_CLS_CD: '0', // 0: 순매수
            FID_BLNG_CLS_CD: '0',
            FID_TRGT_CLS_CD: '4', // 4: 외국인
            FID_TRGT_EXLS_CLS_CD: '0',
            FID_INPUT_DATE_1: format(from, 'yyyyMMdd'),
            FID_INPUT_DATE_2: format(to, 'yyyyMMdd'),
            FID_INPUT_PRICE_1: '',
            FID_INPUT_PRICE_2: '',
            FID_VOL_CNT: '100',
          },
        },
      ),
    );

    return (data.output ?? []).map((item) => ({
      ticker: item.mksc_shrn_iscd,
      name: item.hts_kor_isnm,
      accumulatedNetBuy: Number(item.frgn_ntby_qty),
    }));
  }
}
