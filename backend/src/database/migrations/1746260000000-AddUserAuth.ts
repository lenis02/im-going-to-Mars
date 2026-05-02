import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAuth1746260000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" SERIAL PRIMARY KEY,
        "googleId" VARCHAR(255) NOT NULL UNIQUE,
        "email" VARCHAR(255) NOT NULL,
        "displayName" VARCHAR(255) NOT NULL
      )
    `);

    // 기존 데이터 제거 (user 격리 전 데이터)
    await queryRunner.query(`DELETE FROM daily_price`);
    await queryRunner.query(`DELETE FROM stock`);

    // ticker 단독 unique 제약 제거
    await queryRunner.query(`
      DO $$ DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT tc.constraint_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_name = 'stock'
            AND tc.constraint_type = 'UNIQUE'
            AND kcu.column_name = 'ticker'
        LOOP
          EXECUTE 'ALTER TABLE stock DROP CONSTRAINT IF EXISTS "' || r.constraint_name || '"';
        END LOOP;
      END $$
    `);

    await queryRunner.query(`
      ALTER TABLE "stock"
      ADD COLUMN IF NOT EXISTS "userId" INTEGER NOT NULL
      REFERENCES "user"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "stock"
      ADD CONSTRAINT "UQ_stock_ticker_userId" UNIQUE ("ticker", "userId")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stock" DROP CONSTRAINT IF EXISTS "UQ_stock_ticker_userId"`);
    await queryRunner.query(`ALTER TABLE "stock" DROP COLUMN IF EXISTS "userId"`);
    await queryRunner.query(`ALTER TABLE "stock" ADD CONSTRAINT "UQ_stock_ticker" UNIQUE ("ticker")`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user"`);
  }
}
