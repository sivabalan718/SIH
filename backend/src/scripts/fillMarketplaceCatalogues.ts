import { ensureMarketplaceCatalogues } from '../services/catalogue-backfill.service.js';

/** npm run catalogue:fill — generate missing Smart Catalogues (EN/TA/HI) for all published products. */
ensureMarketplaceCatalogues()
  .then((s) => {
    console.log(`Smart Catalogue fill complete: ${JSON.stringify(s)}`);
    process.exit(s.failed > 0 ? 1 : 0);
  })
  .catch((e) => {
    console.error('Smart Catalogue fill failed:', e?.message || e);
    process.exit(1);
  });
