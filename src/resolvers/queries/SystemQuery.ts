import { promises } from 'fs';
import { join } from 'path';

import { logger } from '@esss-swap/duo-logger';
import rp from 'request-promise';
import { Resolver, Query } from 'type-graphql';

let cached: string;

@Resolver()
export class SystemQuery {
  @Query(() => String)
  async version() {
    try {
      const content = await promises.readFile(
        join(process.cwd(), 'build-version.txt')
      );

      cached = content.toString().trim();

      return cached;
    } catch (err) {
      if (err.code !== 'ENOENT') {
        logger.logException(
          'Unknown error while reading build-version.txt',
          err
        );
      }

      return '<unknown>';
    }
  }

  @Query(() => String)
  async factoryVersion() {
    if (cached) {
      return cached;
    }

    try {
      // For some reasons it can't find the global URL type for Node.js
      //  override the default endpoint path end use the version
      // @ts-ignore
      const url = new URL(process.env.USER_OFFICE_PDF_FACTORY_ENDPOINT!);
      url.pathname = '/version';

      return await rp.get(url.toString());
    } catch (err) {
      logger.logException(
        'Unknown error while requesting factory build-version.txt',
        err
      );

      return '<unknown>';
    }
  }
}
