import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LicenseService } from './license.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [ConfigModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, LicenseService],
  exports: [SubscriptionsService, LicenseService],
})
export class SubscriptionsModule {}
