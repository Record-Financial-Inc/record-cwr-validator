// Vendored CISAC CWR lookup tables: the code lists every coded field is validated against.
//
// Provenance: copied verbatim from the MIT-licensed weso/CWR-DataApi `data_cwr/` code lists
// (github.com/weso/CWR-DataApi, MIT). These are CWR **2.1-era** snapshots: society and TIS lists in
// particular have grown since. They are wired as `warning`-level checks (lookupCodeRule) precisely
// because a stale table would otherwise false-reject a valid 2.2 code. Refresh from the authoritative
// CISAC CRF020 (Validation and Lookup Tables) / current society + TIS registries when available; this
// file is the single place to do it.
//
// Keys match the `source` bindings declared in grammar/record-grammar.ts.

const RAW: Record<string, string> = {
  // Numeric-coded (normalised by integer value: leading zeros are insignificant).
  society_code:
    '0,00,000,001,002,003,004,005,006,007,008,009,01,010,011,012,013,014,015,016,017,018,019,02,020,021,022,023,024,025,026,027,028,029,03,030,031,032,033,034,035,036,037,038,039,04,040,041,042,043,044,045,046,047,048,049,05,050,051,052,053,054,055,056,057,058,059,06,060,061,062,063,064,065,066,067,068,069,07,070,071,072,073,074,075,076,077,078,079,08,080,081,082,083,084,085,086,087,088,089,09,090,091,092,093,094,095,096,097,098,099,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,300,301,302,303,304,305,306,307,308,309,310',
  tis_code:
    '0004,0008,0012,0020,0024,0028,0031,0032,0036,0040,0044,0048,0050,0051,0052,0056,0064,0068,0070,0072,0076,0084,0090,0096,0100,0104,0108,0112,0116,0120,0124,0132,0140,0144,0148,0152,0156,0158,0170,0174,0178,0180,0188,0191,0192,0196,0200,0203,0204,0208,0212,0214,0218,0222,0226,0230,0231,0232,0233,0242,0246,0250,0258,0262,0266,0268,0270,0276,0278,0280,0288,0296,0300,0308,0320,0324,0328,0332,0336,0340,0344,0348,0352,0356,0360,0364,0368,0372,0376,0380,0384,0388,0392,0398,0400,0404,0408,0410,0414,0417,0418,0422,0426,0428,0430,0434,0438,0440,0442,0450,0454,0458,0462,0466,0470,0478,0480,0484,0492,0496,0498,0499,0504,0508,0512,0516,0520,0524,0528,0540,0548,0554,0558,0562,0566,0578,0583,0584,0585,0586,0591,0598,0600,0604,0608,0616,0620,0624,0626,0630,0634,0642,0643,0646,0659,0662,0670,0674,0678,0682,0686,0688,0690,0694,0702,0703,0704,0705,0706,0710,0716,0720,0724,0728,0729,0732,0736,0740,0748,0752,0756,0760,0762,0764,0768,0776,0780,0784,0788,0792,0795,0798,0800,0804,0807,0810,0818,0826,0834,0840,0854,0858,0860,0862,0882,0886,0887,0890,0891,0894,2100,2101,2102,2103,2104,2105,2106,2107,2108,2109,2110,2111,2112,2113,2114,2115,2116,2117,2118,2119,2120,2121,2122,2123,2124,2125,2126,2127,2128,2129,2130,2131,2132,2133,2134,2136',

  // Alpha-coded.
  language_code:
    'AA,AB,AF,AM,AR,AS,AY,AZ,BA,BE,BG,BH,BI,BN,BO,BR,CA,CO,CS,CY,DA,DE,DZ,EL,EN,EO,ES,ET,EU,FA,FI,FJ,FO,FR,FY,GA,GD,GL,GN,GU,HA,HI,HR,HU,HW,HY,IA,IE,IK,IN,IS,IT,IW,JA,JI,JW,KA,KK,KL,KM,KN,KO,KS,KU,KY,LA,LN,LO,LT,LV,MG,MI,MK,ML,MN,MO,MR,MS,MT,MY,NA,ND,NE,NL,NO,NS,OC,OM,OR,PA,PL,PM,PS,PT,QU,RM,RN,RO,RU,RW,SA,SD,SG,SH,SI,SK,SL,SM,SN,SO,SQ,SR,SS,ST,SU,SV,SW,TA,TE,TG,TH,TI,TK,TL,TN,TO,TR,TS,TT,TW,UK,UR,UZ,VE,VI,VO,WO,XH,YO,ZH,ZU',
  title_type: 'AL,AT,ET,FT,IT,OL,OT,PT,RT,TE,TT',
  musical_work_distribution_category: 'JAZ,POP,SER,UNC',
  version_type: 'MOD,ORI',
  inclusion_exclusion_indicator: 'E,I',
  text_music_relationship: 'MUS,MTX,TXT',
  composite_type: 'COS,MED,POT,UCO',
  excerpt_type: 'UEX,MOV',
  music_arrangement: 'ARR,ADM,NEW,ORI,UNS',
  lyric_adaptation: 'ADL,MOD,NEW,NON,ORI,REP,TRA,UNS',
  work_type: 'AC,AL,AM,AR,BD,BG,BL,CC,CD,CL,CT,DN,FK,FM,JG,JZ,LA,LN,NA,OP,PK,PP,RB,RK,RP,SD,SG,SY,TA',
  recording_format: 'A,V',
  recording_technique: 'A,D,U',
  media_type:
    'CD,CD2,CDM,CDS,CE,CE2,CEP,CES,CXM,CXS,DC,DC2,DL,DM,DMC,DS,DV1,DV2,DV3,DV4,DW,EMC,EP,EPM,LP,LP2,LP3,LP4,MC,MC2,MC3,MC4,MCP,MD,MD2,MDP,MDR,MDS,MLP,MMC,RCD,RCE,RDS,RMC,RMS,S,SA,SA2,SCD,SM2,SMC',
  special_agreement_indicator: 'B,L,N,R,U,Y',
  agreement_type: 'OG,OS,PG,PS',
  agreement_role_code: 'AC,AS',
  usa_license_indicator: 'A,B,S',
  publisher_type: 'AQ,AM,PA,E,ES,SE',
  writer_designation_code: 'A,AD,AR,C,CA,PA,SA,SR,TR',
  intended_purpose: 'COM,FIL,GEN,LIB,MUL,RAD,TEL,THR,VID',
  standard_instrumentation_type:
    'AUD,BBA,BCH,BND,BQN,BQU,BRC,BTR,BXT,CAO,CBA,CCH,CEN,CHO,CLC,COR,CQN,DCH,FLC,GML,GQT,HNC,JZE,MCH,MXC,OQU,ORC,PCE,PDU,PFH,PQN,PQU,PTR,SBA,SGT,SOC,SOR,SQN,SQT,SQU,TBC,TCH,TPC,TUC,UCH,WCH,WEN,WQN,WQR,YCH',
  instrument_code:
    'ACC,ACL,AFL,AHN,ALP,ALT,AMP,ARC,ASX,BAG,BAR,BAS,BBF,BBT,BCL,BDN,BDR,BEL,BFT,BGL,BGT,BHN,BKA,BNG,BNJ,BOB,BOY,BQF,BRC,BRT,BSN,BSP,BSS,BSX,BTN,CAL,CAR,CBC,CBN,CCL,CEL,CHM,CIM,CLR,CNB,CNG,CNT,COM,CST,CTN,CVD,CYM,DIJ,DIZ,DJM,DRK,DRM,DUL,EBG,EFC,EGT,EHN,ELL,ELP,EOG,ERH,EUP,FLG,FLT,FRN,GHM,GHP,GLS,GNG,GTR,HAR,HBL,HCK,HPS,HRM,HRN,HRP,HUR,KAZ,KEY,KLV,KOT,LUT,LYR,MAN,MAR,MBR,MCS,MEL,MEZ,MID,MSB,NAF,NAR,NHN,OBD,OBO,OND,ORG,PER,PIA,PIC,PPA,PRO,PRP,PWH,REC,RUA,SAM,SAX,SDM,SEQ,SHK,SHM,SHO,SHW,SIT,SNR,SNS,SOP,SOU,SPO,SRC,SSX,STD,SYN,TAB,TAM,TAP,TBA,TEN,THE,THN,TIM,TMB,TMN,TRC,TRI,TRM,TSX,TTM,TYP,UKE,VCL,VDG,VIB,VID,VLA,VLN,VOC,WBK,WHS,WTB,XYL,YQN,ZHG,ZIT',
  sender_type: 'PB,SO,AA,WR',
  transaction_type: 'ACK,AGR,COP,EXC,ISW,NWR,REV',
  type_of_right: 'ALL,MEC,PER,SYN',
  subject_code: 'DL,DW,IQ,RQ,SC',
  transaction_status: 'AC,AS,CO,DU,NP,RA,RC,RJ',
  character_set: 'BIG5,GB',
  message_level: 'E,F,G,R,T',
  message_type: 'E,F,G,R,T',
};

/** Tables whose codes are numeric: compared by integer value, so leading zeros don't matter. */
const INT_TABLES = new Set(['society_code', 'tis_code']);

const normCode = (s: string) => s.trim().toUpperCase();
const normInt = (s: string): string => {
  const t = s.trim();
  const n = parseInt(t, 10);
  return Number.isNaN(n) ? t.toUpperCase() : String(n);
};

function buildSet(name: string, raw: string): Set<string> {
  const norm = INT_TABLES.has(name) ? normInt : normCode;
  return new Set(raw.split(',').map(norm).filter((v) => v.length > 0));
}

export const LOOKUP_TABLES: Record<string, Set<string>> = Object.fromEntries(
  Object.entries(RAW).map(([k, v]) => [k, buildSet(k, v)]),
);

/**
 * Is `value` a member of the lookup table `source`?
 * Returns null when no table is vendored for that source (so callers skip it rather than false-flag).
 */
export function isValidCode(source: string, value: string): boolean | null {
  const table = LOOKUP_TABLES[source];
  if (!table) return null;
  const norm = INT_TABLES.has(source) ? normInt : normCode;
  return table.has(norm(value));
}
