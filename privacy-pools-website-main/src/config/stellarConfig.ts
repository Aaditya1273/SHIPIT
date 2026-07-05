export const STELLAR_CONFIG = {
  network: 'testnet' as const,
  networkPassphrase: 'Test SDF Network ; September 2015',
  rpcUrl: 'https://soroban-testnet.stellar.org:443',
  horizonUrl: 'https://horizon-testnet.stellar.org',

  contractId: 'CAYDGB7SLRONSTM4G562HEGPECFJNQKGRTSY4ZUJPGFX33HOUNAEX5LW',
  assetId: 'CAEPLVCK4VMA6HJDKYWBIAV7DE7EBQ6ZWUCEHQ22DEJHEPMNLFNX2YQ6',
  assetSymbol: 'ZKUSDC',
  assetDecimals: 7,

  deployerAddress: 'GDA3OLN4HZETWCSIJV6OMOXDWDTMIUZWHKGSHSYNW36WDAHPVCHJ47LL',
  userAddress: 'GATFXD3G53E5YNX3SJLXMXHSTE4QY2XHMOIC52YVZQVQICDTYUYUUQ55',

  maxDepth: 32,
  blsScalarField: '52435875175126190479447740508185965837690552500527637822603658699938581184513',
} as const;
