import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import * as XLSX from 'xlsx';
import * as iconv from 'iconv-lite'; // 👈 추가
import { StockMaster } from './entities/stock-master.entity';

@Injectable()
export class StockMasterService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StockMasterService.name);

  constructor(
    @InjectRepository(StockMaster)
    private readonly repo: Repository<StockMaster>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const count = await this.repo.count();
    if (count === 0) {
      this.logger.log('stock_master 비어있음 — KRX 동기화 시작');
      await this.syncFromKrx();
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    timeZone: 'Asia/Seoul',
  })
  async handleDailySync() {
    await this.syncFromKrx();
  }

  search(q: string): Promise<StockMaster[]> {
    return this.repo
      .createQueryBuilder('sm')
      .where('sm.name ILIKE :q OR sm.ticker LIKE :q', { q: `%${q}%` })
      .orderBy('sm.market', 'ASC')
      .addOrderBy('sm.name', 'ASC')
      .limit(10)
      .getMany();
  }
  
  async syncFromKrx(): Promise<void> {
    try {
      const [kospi, kosdaq] = await Promise.all([
        this.fetchMarket('KOSPI'),
        this.fetchMarket('KOSDAQ'),
      ]);

      const rows = [...kospi, ...kosdaq];
      if (rows.length === 0) {
        this.logger.warn('KRX에서 데이터를 가져오지 못했습니다');
        return;
      }

      await this.repo
        .createQueryBuilder()
        .insert()
        .into(StockMaster)
        .values(rows)
        .orUpdate(['name', 'market'], ['ticker'])
        .execute();

      this.logger.log(`KRX 동기화 완료: ${rows.length}개 종목`);
    } catch (err) {
      this.logger.error(`KRX 동기화 실패: ${(err as Error).message}`);
    }
  }

  private async fetchMarket(
    market: 'KOSPI' | 'KOSDAQ',
  ): Promise<Array<{ ticker: string; name: string; market: string }>> {
    const marketType = market === 'KOSPI' ? 'stockMkt' : 'kosdaqMkt';
    const url = `https://kind.krx.co.kr/corpgeneral/corpList.do?method=download&marketType=${marketType}`;

    const res = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 30_000,
    });

    const decodedHtml = iconv.decode(Buffer.from(res.data), 'euc-kr');

    const workbook = XLSX.read(decodedHtml, { type: 'string' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      raw: false,
      defval: '',
    });

    return rows
      .map((row) => {
        const rawTicker = String(row['종목코드'] ?? '').replace(/\s/g, '');
        const ticker = rawTicker.padStart(6, '0');
        const name = String(row['회사명'] ?? '').trim();
        return { ticker, name, market };
      })
      .filter((r) => /^\d{6}$/.test(r.ticker) && r.name.length > 0);
  }
}
