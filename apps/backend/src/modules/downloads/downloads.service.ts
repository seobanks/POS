import { existsSync } from 'node:fs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const DOWNLOAD_CHANNELS: Record<string, string> = {
  windows: 'https://github.com/seobanks/POS/releases/latest/download/HanvaPOS-Setup-v1.0.0.exe',
  github: 'https://github.com/seobanks/POS',
  'install-script':
    'https://raw.githubusercontent.com/seobanks/POS/main/install.sh',
  docker: 'https://github.com/seobanks/POS#one-click-install',
  casaos: 'https://github.com/IceWhaleTech/CasaOS-AppStore',
};

export type DownloadChannel = keyof typeof DOWNLOAD_CHANNELS;

@Injectable()
export class DownloadsService {
  constructor(private readonly prisma: PrismaService) {}

  resolveChannel(channel: string): string {
    const url = DOWNLOAD_CHANNELS[channel];
    if (!url) throw new NotFoundException('Unknown download channel');
    return url;
  }

  async recordStat(channel: string): Promise<void> {
    try {
      await this.prisma.downloadStat.upsert({
        where: { channel },
        create: { channel, count: 1 },
        update: { count: { increment: 1 } },
      });
    } catch {
      // Non-blocking in case of DB read-only or disconnect
    }
  }

  async recordAndResolve(channel: string): Promise<string> {
    const url = this.resolveChannel(channel);
    await this.recordStat(channel);
    return url;
  }

  async stats(): Promise<{ channel: string; count: number }[]> {
    const rows = await this.prisma.downloadStat.findMany({
      orderBy: { channel: 'asc' },
    });
    const byChannel = new Map(rows.map((r) => [r.channel, r.count]));
    return Object.keys(DOWNLOAD_CHANNELS).map((channel) => ({
      channel,
      count: byChannel.get(channel) ?? 0,
    }));
  }
}
