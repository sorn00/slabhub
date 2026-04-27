const { Pool } = require('pg')

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function main() {
  console.log('Creating tables...')
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS directory_fabricators (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(255) UNIQUE NOT NULL,
      company_name VARCHAR(255) NOT NULL,
      city VARCHAR(100),
      state VARCHAR(50),
      state_code VARCHAR(2),
      phone VARCHAR(50),
      website VARCHAR(255),
      email VARCHAR(255),
      address TEXT,
      services TEXT[],
      brands TEXT[],
      msi_confirmed BOOLEAN DEFAULT false,
      msi_dealer_locator BOOLEAN DEFAULT false,
      tier VARCHAR(20) DEFAULT 'free',
      claimed BOOLEAN DEFAULT false,
      claimed_by INTEGER,
      claimed_at TIMESTAMP,
      description TEXT,
      logo_url TEXT,
      cover_image_url TEXT,
      gallery_urls TEXT[],
      years_in_business INTEGER,
      license_number VARCHAR(100),
      insurance_verified BOOLEAN DEFAULT false,
      rating DECIMAL(3,2),
      review_count INTEGER DEFAULT 0,
      lead_count INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `)
  console.log('directory_fabricators created')

  await pool.query(`
    CREATE TABLE IF NOT EXISTS fabricator_reviews (
      id SERIAL PRIMARY KEY,
      fabricator_id INTEGER REFERENCES directory_fabricators(id),
      reviewer_name VARCHAR(255),
      reviewer_email VARCHAR(255),
      rating INTEGER CHECK (rating BETWEEN 1 AND 5),
      review_text TEXT,
      project_type VARCHAR(100),
      verified BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `)
  console.log('fabricator_reviews created')

  try {
    await pool.query(`
      ALTER TABLE directory_fabricators 
      ADD CONSTRAINT fk_claimed_by FOREIGN KEY (claimed_by) REFERENCES users(id);
    `)
    console.log('FK constraint added')
  } catch(e) {
    console.log('FK constraint already exists or skipped:', e.message)
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS directory_claim_requests (
      id SERIAL PRIMARY KEY,
      fabricator_id INTEGER REFERENCES directory_fabricators(id),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      role VARCHAR(50),
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `)
  console.log('directory_claim_requests created')

  await pool.end()
  console.log('DONE')
}

main().catch(err => { console.error(err); process.exit(1) })
