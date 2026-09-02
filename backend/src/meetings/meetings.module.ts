import { Module } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [GoogleCalendarModule, LeadsModule],
  controllers: [MeetingsController],
  providers: [MeetingsService],
})
export class MeetingsModule {}
