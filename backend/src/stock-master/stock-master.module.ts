import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockMaster } from './entities/stock-master.entity';
import { StockMasterService } from './stock-master.service';
import { StockMasterController } from './stock-master.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StockMaster])],
  controllers: [StockMasterController],
  providers: [StockMasterService],
})
export class StockMasterModule {}
