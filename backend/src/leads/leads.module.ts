import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { LeadsImportController } from './leads-import.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [LeadsController, LeadsImportController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
