export interface KisTokenResponse {
  access_token: string;
  expires_in: number;
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
  output2: KisDailyPriceItem[];
}

export interface KisForeignRankingItem {
  mksc_shrn_iscd: string; // 종목코드
  hts_kor_isnm: string; // 종목명
  frgn_ntby_qty: string; // 외인 누적 순매수량
}

export interface KisForeignRankingResponse {
  rt_cd: string;
  msg_cd: string;
  msg1: string;
  output: KisForeignRankingItem[];
}
