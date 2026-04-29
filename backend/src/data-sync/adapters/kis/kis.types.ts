export interface KisTokenResponse {
  access_token: string;
  expires_in: number;
}

export interface KisDailyPriceOutput1 {
  hts_kor_isnm: string; // 종목명
}

export interface KisDailyPriceItem {
  stck_bsop_date: string; // 영업일자 YYYYMMDD
  stck_oprc: string; // 시가
  stck_hgpr: string; // 고가
  stck_lwpr: string; // 저가
  stck_clpr: string; // 종가
  acml_vol: string; // 누적거래량
}

export interface KisDailyPriceResponse {
  rt_cd: string;
  msg_cd: string;
  msg1: string;
  output1: KisDailyPriceOutput1;
  output2: KisDailyPriceItem[];
}

export interface KisInvestorTradeItem {
  stck_bsop_date: string; // 영업일자 YYYYMMDD
  frgn_ntby_qty: string; // 외국인 순매수 수량
}

export interface KisInvestorTradeByStockResponse {
  rt_cd: string;
  msg_cd: string;
  msg1: string;
  output1: { rprs_mrkt_kor_name: string };
  output2: KisInvestorTradeItem[];
}
