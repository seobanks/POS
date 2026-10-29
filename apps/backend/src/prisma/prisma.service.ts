import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
    async onModuleInit() {
    try {
      await this.$connect();
    } catch (err) {
      console.error('Failed to connect to database during onModuleInit:', err);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Extend default 5000ms interactive transaction timeout to 30000ms.
  // When running against cloud-hosted PostgreSQL (Neon/Supabase) over the internet,
  // multi-step operations require higher latency allowances.
  override $transaction(arg: any, options?: any): Promise<any> {
    if (typeof arg === 'function') {
      return super.$transaction(arg, {
        maxWait: 15000,
        timeout: 30000,
        ...options,
      });
    }
    return super.$transaction(arg, options);
  }
}
