export interface KisTokenResponse {
  access_token: string;
  expires_in: number;
}

export interface KisDailyPriceOutput1 {
  hts_kor_isnm: string; // 종목명
}

export interface KisDailyPriceItem {
  stck_bsop_date: string;  // 주식 영업 일자
  stck_clpr: string;       // 주식 종가
  prdy_vrss: string;       // 전일 대비
  prdy_vrss_sign: string;  // 전일 대비 부호 (1:상한 2:상승 3:보합 4:하한 5:하락)
  prdy_ctrt: string;       // 전일 대비율 (%)
  acml_vol: string;        // 누적 거래량
  acml_tr_pbmn: string;    // 누적 거래 대금 (백만원)
  stck_oprc: string;       // 주식 시가
  stck_hgpr: string;       // 주식 최고가
  stck_lwpr: string;       // 주식 최저가
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
