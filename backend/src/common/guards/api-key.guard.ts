import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

/**
 * Jednoduchá autentizace pro server-to-server integrace (např. noční
 * automatizace, co sama zapisuje kontakty) - bez JWT loginu, jen pevný
 * klíč v hlavičce X-Api-Key, který musí sedět s env proměnnou IMPORT_API_KEY.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const providedKey = request.headers['x-api-key'];
    const expectedKey = process.env.IMPORT_API_KEY;

    if (!expectedKey) {
      throw new UnauthorizedException('IMPORT_API_KEY není na serveru nastaven');
    }
    if (!providedKey || providedKey !== expectedKey) {
      throw new UnauthorizedException('Neplatný nebo chybějící API klíč');
    }
    return true;
  }
}
