import { existsSync } from 'node:fs';
import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { DownloadsService } from './downloads.service';

@ApiTags('downloads')
@Controller('v1/downloads')
export class DownloadsController {
  constructor(private readonly downloads: DownloadsService) {}

  @Get('stats')
  stats() {
    return this.downloads.stats();
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get('go/:channel')
  async go(@Param('channel') channel: string, @Res() res: Response) {
    if (channel === 'windows') {
      const localExe =
        process.env.WINDOWS_INSTALLER_PATH || 'C:\\hp-dist\\HanvaPOS-Setup-v1.0.0.exe';
      if (existsSync(localExe)) {
        await this.downloads.recordStat('windows');
        return res.download(localExe, 'HanvaPOS-Setup-v1.0.0.exe');
      }
    }

    const url = await this.downloads.recordAndResolve(channel);
    res.redirect(302, url);
  }
}
