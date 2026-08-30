import { User } from '@supabase/supabase-js';
import { ArtisanRecord } from '../services/artisan.service.js';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      artisan?: ArtisanRecord;
    }
  }
}
